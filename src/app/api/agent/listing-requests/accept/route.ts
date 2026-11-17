import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptListingRequest, ListingRequestError } from "@/lib/listingRequest";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!agent) return NextResponse.json({ error: "No partner profile" }, { status: 403 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await acceptListingRequest(id, agent.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ListingRequestError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
