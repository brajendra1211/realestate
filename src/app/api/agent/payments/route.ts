import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { getPayoutsForAgent } from "@/lib/payout";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [{ entries, totals }, payouts, shopUnlocks] = await Promise.all([
    getAgentCommissionSummary(agent.id),
    getPayoutsForAgent(agent.id),
    prisma.agentShopUnlock.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const totalEarned = Object.values(totals).reduce((a, b) => a + b, 0);
  const totalWithdrawn = payouts
    .filter((p) => p.status === "PAID")
    .reduce((a, p) => a + p.netAmount, 0);
  const pendingWithdrawn = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((a, p) => a + p.netAmount, 0);

  return NextResponse.json({
    walletBalance: agent.walletBalance,
    totalEarned,
    totalWithdrawn,
    pendingWithdrawn,
    commissionTotals: totals,
    earnings: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      note: e.note,
      refId: e.refId,
      createdAt: e.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      grossAmount: p.grossAmount,
      tdsPercent: p.tdsPercent,
      tdsAmount: p.tdsAmount,
      netAmount: p.netAmount,
      status: p.status,
      paymentMode: p.paymentMode,
      requestedAt: p.requestedAt.toISOString(),
      processedAt: p.processedAt ? p.processedAt.toISOString() : null,
    })),
    shopUnlocks: shopUnlocks.map((s) => ({
      id: s.id,
      amount: s.amount,
      customerPhone: s.customerPhone,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
