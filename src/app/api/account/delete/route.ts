import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// In-app "Delete my account" (an App Store requirement). The person's profile is erased and the account can no
// longer sign in. Rows that other people's records and payments point at (unlocks, listings, payouts) are kept
// but no longer carry any personal details, so money and audit history stay consistent.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "ADMIN" || session.user.role === "SUBADMIN") {
    return NextResponse.json({ error: "Admin accounts can't be deleted here." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== "DELETE") return NextResponse.json({ error: "Please confirm the deletion." }, { status: 400 });

  const userId = session.user.id;
  const agent = await prisma.agentProfile.findUnique({ where: { userId }, select: { id: true, walletBalance: true } });
  if (agent && agent.walletBalance > 0) {
    return NextResponse.json(
      { error: `You still have ₹${agent.walletBalance} in your wallet. Withdraw it or contact support before deleting your account.` },
      { status: 409 },
    );
  }

  const suffix = userId.slice(-8);
  await prisma.$transaction(async (tx) => {
    await tx.pushToken.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Deleted user",
        email: null,
        phone: null,
        secondaryPhone: null,
        whatsappNumber: null,
        slug: null,
        about: null,
        logoUrl: null,
        company: null,
        address: null,
        website: null,
        instagramUrl: null,
        facebookUrl: null,
        passwordHash: null,
        dateOfBirth: null,
        age: null,
        panNumber: null,
        panCardUrl: null,
        aadhaarNumber: null,
        aadhaarFrontUrl: null,
        aadhaarBackUrl: null,
        bankAccountName: null,
        bankAccountNumber: null,
        bankIfsc: null,
        bankName: null,
        bankBranch: null,
        cancelledChequeUrl: null,
        liveLatitude: null,
        liveLongitude: null,
        liveLocationAt: null,
        verified: false,
      },
    });
    if (agent) {
      await tx.agentProfile.update({
        where: { id: agent.id },
        data: { status: "REJECTED", rejectionReason: "Account deleted by the partner", primeStatus: false, buzzerAlerts: false, shopName: `Deleted partner ${suffix}`, shopAddress: "", shopLatitude: null, shopLongitude: null },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
