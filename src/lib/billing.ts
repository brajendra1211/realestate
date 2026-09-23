import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { removeAgentFromIndex } from "@/lib/agentGeo";

// PDF 1 & PDF 2:
// - Auto-debit from wallet first.
// - Insufficient balance fallback to UPI / Google Pay Auto-Pay mandate.
// - 5 days before renewal alert if wallet balance is low.
// - Non-renewal penalty (Visibility Pushback): properties not deleted, but
//   demoted in ranking (visibilityDeprioritized: true).
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

  const planPrice = subscription.plan.price;
  const canAffordWallet = agent.walletBalance >= planPrice;

  // 1. First attempt: Wallet Balance deduction
  if (canAffordWallet) {
    await prisma.$transaction([
      prisma.agentProfile.update({
        where: { id: agentProfileId },
        data: {
          walletBalance: { decrement: planPrice },
          visibilityDeprioritized: false,
          primeStatus: true,
          renewalAlertSentAt: null,
        },
      }),
      prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } }),
      prisma.subscription.create({
        data: {
          userId: agent.userId,
          planId: subscription.planId,
          status: "ACTIVE",
          amount: planPrice,
          endDate: subscription.plan.durationDays
            ? new Date(Date.now() + subscription.plan.durationDays * 24 * 60 * 60 * 1000)
            : null,
        },
      }),
    ]);

    await notifyUser(
      agent.user,
      `Your agent code subscription renewed automatically. ₹${planPrice} was deducted from your wallet.`,
      "Subscription renewed"
    );
    return { renewed: true as const, method: "WALLET" as const };
  }

  // 2. Fallback attempt: Linked UPI / Google Pay Auto-Pay Mandate (PDF 2 Page 1)
  if (agent.autoPayActive && agent.autoPayMandate) {
    await prisma.$transaction([
      prisma.agentProfile.update({
        where: { id: agentProfileId },
        data: {
          visibilityDeprioritized: false,
          primeStatus: true,
          renewalAlertSentAt: null,
        },
      }),
      prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } }),
      prisma.subscription.create({
        data: {
          userId: agent.userId,
          planId: subscription.planId,
          status: "ACTIVE",
          amount: planPrice,
          endDate: subscription.plan.durationDays
            ? new Date(Date.now() + subscription.plan.durationDays * 24 * 60 * 60 * 1000)
            : null,
        },
      }),
    ]);

    await notifyUser(
      agent.user,
      `Wallet balance was low, so your subscription renewed via linked Auto-Pay mandate (${agent.autoPayMandate}). ₹${planPrice} was charged.`,
      "Auto-Pay renewal successful"
    );
    return { renewed: true as const, method: "AUTOPAY" as const };
  }

  // 3. Demote and apply Visibility Pushback — PDF 2 Page 1:
  // "Agar renewal miss hota hai, toh agent ki properties delete nahi hongi,
  // lekin customer feed mein sabse Niche Push (Low Priority) kar di jayegi."
  await prisma.$transaction([
    prisma.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } }),
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: {
        primeStatus: false,
        visibilityDeprioritized: true,
      },
    }),
  ]);

  // Removed from hot dispatch/broadcast radius index immediately
  await removeAgentFromIndex(agentProfileId);

  await notifyUser(
    agent.user,
    `Your agent renewal failed — wallet balance (₹${agent.walletBalance}) was short of ₹${planPrice} due and no active Auto-Pay mandate was found. Your listings have been pushed to lowest feed visibility. Please top up and renew to restore priority ranking.`,
    "Renewal failed — listings deprioritized"
  );
  return { renewed: false as const };
}

/**
 * 5-Day Pre-Renewal Warning Alert Engine — PDF 2 Page 1:
 * "wallet mein paise nahi hai to usko payment renewal alert show aa jaayega 5 days pehle hi"
 */
export async function checkUpcomingRenewalAlerts() {
  const now = new Date();
  const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const upcomingSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        gt: now,
        lte: fiveDaysOut,
      },
    },
    include: { plan: true },
  });

  let alertsSent = 0;
  for (const sub of upcomingSubscriptions) {
    const agent = await prisma.agentProfile.findUnique({
      where: { userId: sub.userId },
      include: { user: { select: { phone: true, email: true } } },
    });
    if (!agent || !sub.endDate) continue;

    // Check if wallet balance is insufficient for renewal
    if (agent.walletBalance < sub.plan.price) {
      // Avoid sending duplicate alerts multiple times per day
      const lastSent = agent.renewalAlertSentAt;
      const hoursSinceLast = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60) : 999;

      if (hoursSinceLast >= 24) {
        const daysLeft = Math.max(1, Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        await notifyUser(
          agent.user,
          `Renewal Alert: Your agent code subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Current wallet balance is ₹${agent.walletBalance} (₹${sub.plan.price} required). Please top up your wallet or configure Auto-Pay to prevent property visibility pushback.`,
          "Upcoming renewal alert"
        );

        await prisma.agentProfile.update({
          where: { id: agent.id },
          data: { renewalAlertSentAt: now },
        });
        alertsSent += 1;
      }
    }
  }

  return { alertsSent };
}

// Called by the daily BullMQ repeatable job (src/lib/queues/billingQueue.ts) and manual admin trigger.
export async function checkAllPrimeRenewals() {
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

  // Also check and dispatch 5-day renewal warning alerts
  const { alertsSent } = await checkUpcomingRenewalAlerts();

  return { renewed, demoted, alertsSent };
}

