import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Toggles a Property in/out of the buyer's saved list — the REST
// equivalent of src/app/buyer/actions.ts's toggleSavedProperty.
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const propertyId = String(body?.propertyId ?? "").trim();
  if (!propertyId) return NextResponse.json({ error: "validation" }, { status: 400 });

  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: session.user.id, propertyId } },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedProperty.create({ data: { userId: session.user.id, propertyId } });
  return NextResponse.json({ saved: true });
}
