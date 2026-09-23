import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSwitchAgent } from "@/lib/agentSwitch";

// Mirrors src/app/buyer/dashboard/page.tsx's data-fetching in a single
// mobile-friendly response, since the Flutter app can't call Next.js
// Server Components/Actions directly.
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, savedProperties, enquiries, currentDispatch] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.savedProperty.findMany({
      where: { userId: session.user.id },
      include: { property: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enquiry.findMany({
      where: { buyerId: session.user.id },
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispatchRequest.findFirst({
      where: { buyerId: session.user.id, status: "MATCHED" },
      include: { acceptedAgent: { select: { id: true, agentCode: true, shopName: true } } },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);

  const switchGate = user.phone ? await canSwitchAgent(user.phone) : null;

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    savedProperties: savedProperties.map((s) => s.property),
    enquiries,
    currentAgent: currentDispatch?.acceptedAgent
      ? {
          ...currentDispatch.acceptedAgent,
          latitude: currentDispatch.latitude,
          longitude: currentDispatch.longitude,
        }
      : null,
    switchGate,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "email" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || "Buyer",
      email: email || null,
      phone: phone || null,
    },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
}
