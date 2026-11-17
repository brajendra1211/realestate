"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { parseTypes } from "@/lib/commissionMode";
import type { CommissionType } from "@/generated/prisma";

const TYPES: CommissionType[] = [
  "BROKERAGE",
  "UNLOCK_SPLIT",
  "GOLD_SPLIT",
  "DEAL_PROFIT_SHARE",
  "REGISTRATION_REFERRAL",
  "AGENT_REFERRAL",
  "CUSTOMER_PROPERTY_UPDATE",
  "REFERRAL_CUSTOMER_RENEWAL",
  "COMPANY_FIVE_STAR_REWARD",
];

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  return session;
}

function isType(v: string): v is CommissionType {
  return (TYPES as string[]).includes(v);
}

/** Global switch: should this commission type be credited automatically, or entered by hand? */
export async function setCommissionModeAction(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!isType(type) || (mode !== "AUTO" && mode !== "MANUAL")) return;

  const current = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { manualCommissionTypes: true },
  });
  const set = parseTypes(current?.manualCommissionTypes);
  if (mode === "MANUAL") set.add(type);
  else set.delete(type);
  const value = [...set].join(",");

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { manualCommissionTypes: value },
    create: { id: "singleton", manualCommissionTypes: value },
  });
  revalidatePath("/admin/partners");
}

/** Per-partner override: which commission types are auto-credited for this one partner. */
export async function setAgentAutoTypesAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "");
  if (!agentId) return;
  const autoTypes = new Set(formData.getAll("auto").map(String));
  const manual = TYPES.filter((t) => !autoTypes.has(t));
  await prisma.agentProfile.update({
    where: { id: agentId },
    data: { manualCommissionTypes: manual.join(",") },
  });
  revalidatePath("/admin/partners");
}

/** Admin enters a commission by hand: ledger entry + wallet credit in one transaction. */
export async function creditCommissionManuallyAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "");
  const type = String(formData.get("type") ?? "");
  const amount = Math.round(Number(formData.get("amount")));
  const note = String(formData.get("note") ?? "").trim();

  if (!agentId || !isType(type) || !Number.isFinite(amount) || amount <= 0) {
    redirect("/admin/partners?tab=commissions&error=manual");
  }

  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentId },
    include: { user: { select: { phone: true, email: true } } },
  });
  if (!agent) redirect("/admin/partners?tab=commissions&error=manual");

  await prisma.$transaction([
    prisma.commissionLedgerEntry.create({
      data: { agentId, type, amount, note: note ? `Manual credit by admin: ${note}` : "Manual credit by admin" },
    }),
    prisma.agentProfile.update({ where: { id: agentId }, data: { walletBalance: { increment: amount } } }),
  ]);

  await notifyUser(
    agent.user,
    `₹${amount.toLocaleString("en-IN")} commission has been added to your wallet by the admin.`,
    "Commission credited"
  );

  revalidatePath("/admin/partners");
  redirect(`/admin/partners?tab=commissions&agentId=${agentId}&saved=manual`);
}
