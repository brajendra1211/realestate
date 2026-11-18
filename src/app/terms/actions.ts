"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function acceptTermsAction() {
  const session = await auth();
  if (!session) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { termsAcceptedAt: new Date() } });
}
