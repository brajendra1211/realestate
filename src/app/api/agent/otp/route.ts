import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestOtp, looksLikeEmail, normalizeIdentifier, phoneDigitsMatch } from "@/lib/otp";

async function agentExists(identifier: string) {
  if (looksLikeEmail(identifier)) {
    const user = await prisma.user.findUnique({ where: { email: identifier } });
    return user?.role === "AGENT";
  }
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", phone: { not: null } },
    select: { phone: true },
  });
  return agents.some((agent) => phoneDigitsMatch(agent.phone, identifier));
}

// Public — this *is* the login step, no session exists yet. Verification goes
// through NextAuth's /api/auth/callback/agent-otp. The OTP is only sent to an
// existing agent so this can't be used to message arbitrary numbers.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = normalizeIdentifier(String(body?.identifier ?? ""));
  if (!identifier) return NextResponse.json({ error: "validation" }, { status: 400 });

  if (!(await agentExists(identifier))) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const result = await requestOtp(identifier);
  if (!result.sent) return NextResponse.json({ error: "send" }, { status: 502 });

  return NextResponse.json({ identifier: result.identifier, channel: result.channel });
}
