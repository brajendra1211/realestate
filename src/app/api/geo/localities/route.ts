import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cityId = new URL(request.url).searchParams.get("cityId");
  if (!cityId) return NextResponse.json([]);

  const localities = await prisma.locality.findMany({
    where: { cityId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(localities);
}
