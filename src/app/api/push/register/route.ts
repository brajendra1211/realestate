import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Called once after login (mobile app) once an FCM token is available.
// Upsert on the token itself (unique) rather than one-row-per-user, so a
// reinstall/re-login doesn't need to find-then-replace its old row.
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const platform = String(body?.platform ?? "").trim().toUpperCase();
  if (!token || platform !== "ANDROID") {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: session.user.id, platform },
    create: { userId: session.user.id, token, platform },
  });

  return NextResponse.json({ success: true });
}
