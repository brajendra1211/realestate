import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const feeStatus = url.searchParams.get("feeStatus");
  const validFeeStatus = feeStatus === "PAID" || feeStatus === "PENDING" ? feeStatus : undefined;

  const investors = await prisma.investorProfile.findMany({
    where: validFeeStatus ? { feeStatus: validFeeStatus } : {},
    include: { user: true, referringAgent: { select: { agentCode: true, shopName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(investors);
}
