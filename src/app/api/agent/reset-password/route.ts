import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { looksLikeEmail, normalizeIdentifier, phoneDigitsMatch, verifyOtp } from "@/lib/otp";

const MIN_PASSWORD_LENGTH = 8;

async function findAgent(identifier: string) {
  if (looksLikeEmail(identifier)) {
    const user = await prisma.user.findUnique({ where: { email: identifier } });
    return user?.role === "AGENT" ? user : null;
  }
  const agents = await prisma.user.findMany({ where: { role: "AGENT", phone: { not: null } } });
  return agents.find((agent) => phoneDigitsMatch(agent.phone, identifier)) ?? null;
}

// Public — forgot-password step 2. Step 1 is POST /api/agent/otp, which sends
// the code; here the code proves ownership of the phone/email before the
// password is replaced.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = normalizeIdentifier(String(body?.identifier ?? ""));
  const otp = String(body?.otp ?? "").trim();
  const password = String(body?.password ?? "");

  if (!identifier || !otp || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const agent = await findAgent(identifier);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  if (!(await verifyOtp(identifier, otp))) {
    return NextResponse.json({ error: "invalid_otp" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: agent.id },
    data: { passwordHash: await hashPassword(password) },
  });

  return NextResponse.json({ success: true });
}
