import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Agent code is required" }, { status: 400 });
  }

  const agent = await prisma.agentProfile.findFirst({
    where: {
      OR: [
        { agentCode: code },
        { agentCode: { contains: code } },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          whatsappNumber: true,
          email: true,
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found with this code" }, { status: 404 });
  }

  const phone = agent.user.phone ?? agent.alternatePhone ?? "";
  const whatsapp = agent.user.whatsappNumber ?? phone;

  return NextResponse.json({
    id: agent.id,
    agentCode: agent.agentCode,
    name: agent.user.name,
    shopName: agent.shopName,
    city: agent.city,
    phone,
    whatsapp,
    email: agent.user.email,
    verified: agent.status === "APPROVED",
    primeStatus: agent.primeStatus,
    ratingAvg: agent.ratingAvg ?? 0,
  });
}
