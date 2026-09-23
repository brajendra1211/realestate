import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { createB2BDeal, getDealsForAgent, DealServiceError } from "@/lib/deal";
import type { PaymentMode } from "@/generated/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const deals = await getDealsForAgent(agent.id);
    return NextResponse.json(deals);
  } catch (error) {
    console.error("Failed to fetch deals", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const dealValue = Number(body.dealValue);
  if (!dealValue || dealValue <= 0) {
    return NextResponse.json({ error: "dealValue must be a positive number" }, { status: 400 });
  }

  try {
    const deal = await createB2BDeal({
      dealValue,
      totalCommission: body.totalCommission ? Number(body.totalCommission) : undefined,
      buyerAgentId: body.buyerAgentId || agent.id, // defaults current agent as buyer agent if not specified
      sellerAgentId: body.sellerAgentId || null,
      broadcastId: body.broadcastId || null,
      propertyTitle: body.propertyTitle ? String(body.propertyTitle) : null,
      note: body.note ? String(body.note) : null,
      paymentMode: (body.paymentMode as PaymentMode) || "BANK_TRANSFER",
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    if (error instanceof DealServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create deal", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
