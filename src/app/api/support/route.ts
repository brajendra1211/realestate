import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLA_MS = 2 * 60 * 60 * 1000; // resolve within 2 hours
const CATEGORIES = ["COMMISSION_CONFLICT", "CUSTOMER_COMPLAINT", "WEBSITE_FEEDBACK"] as const;

// Support & dispute desk for the mobile app (any signed-in role).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      category: t.category,
      subject: t.subject,
      message: t.message,
      status: t.status,
      resolution: t.resolution,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { category?: string; subject?: string; message?: string };
  const subject = String(b.subject ?? "").trim().slice(0, 150);
  const message = String(b.message ?? "").trim().slice(0, 4000);
  if (!CATEGORIES.includes(b.category as (typeof CATEGORIES)[number]) || !subject || !message) {
    return NextResponse.json({ error: "Please choose a topic and fill in the subject and message." }, { status: 400 });
  }
  await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      role: session.user.role,
      category: b.category as (typeof CATEGORIES)[number],
      subject,
      message,
      dueAt: new Date(Date.now() + SLA_MS),
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
