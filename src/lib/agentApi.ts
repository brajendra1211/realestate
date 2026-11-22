import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Shared guard for the partner REST routes used by the mobile app. */
export async function requireAgentApi() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const agent = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, agentCode: true, status: true, primeStatus: true, brochureCredits: true, walletBalance: true, user: { select: { name: true } } },
  });
  if (!agent) return { error: NextResponse.json({ error: "No partner profile" }, { status: 403 }) } as const;
  return { agent } as const;
}

export const fail = (error: unknown, fallback = "Something went wrong.", status = 400) =>
  NextResponse.json({ error: error instanceof Error && error.message ? error.message : fallback }, { status });
