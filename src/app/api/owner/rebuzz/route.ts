import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rebuzzRequest, ListingRequestError } from "@/lib/listingRequest";

// Owner rings the partners in range again (free, once a minute) while nobody has accepted.
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const requestId = String(body?.requestId ?? "");
  const mine = await prisma.listingRequest.findFirst({ where: { id: requestId, userId: session.user.id }, select: { id: true } });
  if (!mine) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  try {
    const reached = await rebuzzRequest(mine.id);
    return NextResponse.json({ reached });
  } catch (error) {
    const message = error instanceof ListingRequestError ? error.message : "Could not buzz right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
