import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { advanceDealStage, DealServiceError } from "@/lib/deal";
import type { DealStatus } from "@/generated/prisma";

const ALLOWED_STAGES: DealStatus[] = [
  "ACTIVE",
  "TOKEN_RECEIVED",
  "AGREEMENT_DONE",
  "REGISTRY_COMPLETED",
  "CLOSED",
  "CANCELLED",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "AGENT" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const targetStatus = body.status as DealStatus;

  if (!targetStatus || !ALLOWED_STAGES.includes(targetStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${ALLOWED_STAGES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const updated = await advanceDealStage(id, targetStatus, {
      tokenAmount: body.tokenAmount ? Number(body.tokenAmount) : undefined,
      note: body.note ? String(body.note) : undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DealServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to advance deal stage", error);
    return NextResponse.json({ error: "Failed to advance deal stage" }, { status: 500 });
  }
}
