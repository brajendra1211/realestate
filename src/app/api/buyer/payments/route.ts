import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [propertyUnlocks, shopUnlocks] = await Promise.all([
    prisma.propertyUnlock.findMany({
      where: { buyerId: session.user.id },
      include: {
        agentListing: {
          select: {
            id: true,
            slug: true,
            title: true,
            exactAddress: true,
            price: true,
          },
        },
        assignedAgent: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentShopUnlock.findMany({
      where: { buyerId: session.user.id },
      include: {
        agent: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalSpent =
    propertyUnlocks.reduce((sum, u) => sum + u.amount, 0) +
    shopUnlocks.reduce((sum, s) => sum + s.amount, 0);

  return NextResponse.json({
    totalSpent,
    propertyUnlocks: propertyUnlocks.map((u) => ({
      id: u.id,
      amount: u.amount,
      listingTitle: u.agentListing.title,
      listingSlug: u.agentListing.slug,
      exactAddress: u.agentListing.exactAddress,
      assignedAgentName: u.assignedAgent?.user.name ?? null,
      assignedAgentPhone: u.assignedAgent?.user.phone ?? null,
      createdAt: u.createdAt.toISOString(),
      expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
    })),
    shopUnlocks: shopUnlocks.map((s) => ({
      id: s.id,
      amount: s.amount,
      partnerName: s.agent.user.name,
      partnerPhone: s.agent.user.phone,
      paymentId: s.razorpayPaymentId,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
