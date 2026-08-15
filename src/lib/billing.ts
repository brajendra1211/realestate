import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { removeAgentFromIndex } from "@/lib/agentGeo";

// §3.1: "Monthly Prime subscription auto-debits from the agent's platform
// wallet... if a payment fails, the agent's listings automatically demote
// in ranking and any pending leads reroute to another agent — the agent is
// not deleted, just deprioritized." Deduction is from the wallet (not a
// card/bank auto-charge — no gateway involved), which is why this needed no
// Razorpay recurring-billing integration to build.
export async function renewOrDemoteAgent(agentProfileId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription || subscription.status !== "ACTIVE") return null;

  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    include: { user: { select: { phone: true, email: true } } },
  });
  if (!agent) return null;

  const canAfford = agent.walletBalance >= subscription.plan.price;

  if (canAfford) {
    await prisma.$transaction([
      prisma.agentProfile.update({
        where: { id: agentProfileId },
        data: { walletBalance: { decrement: subscription.plan.price } },
      }),
      prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } }),
      prisma.subscription.create({
        data: {
          userId: agent.userId,
          planId: subscription.planId,
          status: "ACTIVE",
          amount: subscription.plan.price,
          endDate: subscription.plan.durationDays
            ? new Date(Date.now() + subscription.plan.durationDays * 24 * 60 * 60 * 1000)
            : null,
        },
      }),
    ]);

    await notifyUser(
      agent.user,
      `Your Prime plan renewed automatically. ₹${subscription.plan.price} was deducted from your wallet.`,
      "Prime renewed"
    );
    return { renewed: true as const };
  }

  // Demote, don't delete — §3.1's explicit rule.
  await prisma.$transaction([
    prisma.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } }),
    prisma.agentProfile.update({ where: { id: agentProfileId }, data: { primeStatus: false } }),
  ]);
  // Removed from the dispatch/broadcast radius index immediately — a demoted
  // agent should stop receiving fresh leads the moment they lose Prime, not
  // wait for the next full reindex.
  await removeAgentFromIndex(agentProfileId);

  await notifyUser(
    agent.user,
    `Your Prime renewal failed — your wallet balance (₹${agent.walletBalance}) was short of the ₹${subscription.plan.price} due. Your listings are now demoted and won't receive new leads until you top up your wallet and reactivate Prime.`,
    "Prime renewal failed — listings demoted"
  );
  return { renewed: false as const };
}

// Called by the daily BullMQ repeatable job (src/lib/queues/billingQueue.ts).
export async function checkAllPrimeRenewals() {
  // Not filtered by Plan.role — an agent's Prime plan could be tagged AGENT
  // or BOTH; the real gate is "does this subscriber have an AgentProfile,"
  // checked per-row below.
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lte: new Date() } },
  });

  let renewed = 0;
  let demoted = 0;
  for (const subscription of due) {
    const agent = await prisma.agentProfile.findUnique({ where: { userId: subscription.userId } });
    if (!agent) continue;
    const result = await renewOrDemoteAgent(agent.id, subscription.id);
    if (result?.renewed) renewed += 1;
    else if (result) demoted += 1;
  }
  return { renewed, demoted };
}
