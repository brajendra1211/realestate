import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stateId = new URL(request.url).searchParams.get("stateId");
  if (!stateId) return NextResponse.json([]);

  const cities = await prisma.city.findMany({
    where: { stateId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(cities);
}
