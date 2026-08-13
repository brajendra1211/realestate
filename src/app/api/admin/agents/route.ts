import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const validStatus = status === "APPROVED" || status === "REJECTED" || status === "PENDING" ? status : undefined;

  const agents = await prisma.agentProfile.findMany({
    where: validStatus ? { status: validStatus } : {},
    include: { user: true, documents: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agents);
}
