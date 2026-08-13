import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countryId = new URL(request.url).searchParams.get("countryId");
  if (!countryId) return NextResponse.json([]);

  const states = await prisma.state.findMany({
    where: { countryId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(states);
}
