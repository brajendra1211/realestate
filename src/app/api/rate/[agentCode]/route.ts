import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitRating, RatingServiceError } from "@/lib/rating";

export async function POST(request: Request, context: { params: Promise<{ agentCode: string }> }) {
  const { agentCode } = await context.params;
  const agent = await prisma.agentProfile.findUnique({ where: { agentCode } });
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const updated = await submitRating({
      agentId: agent.id,
      customerPhone: String(body.customerPhone ?? ""),
      stars: Number(body.stars),
      review: body.review ? String(body.review) : null,
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof RatingServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
