"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadDocument, createCustomerInvestorAgreement, DocumentVaultServiceError } from "@/lib/documentVault";
import type { DocumentVaultType } from "@/generated/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  return session;
}

export async function uploadDocumentAction(formData: FormData) {
  const session = await requireAdmin();

  const agentCode = String(formData.get("agentCode") ?? "").trim();
  const investorCode = String(formData.get("investorCode") ?? "").trim();
  const masterId = String(formData.get("masterId") ?? "").trim();

  const [agent, investor, masterProperty] = await Promise.all([
    agentCode ? prisma.agentProfile.findUnique({ where: { agentCode } }) : null,
    investorCode ? prisma.investorProfile.findUnique({ where: { investorCode } }) : null,
    masterId ? prisma.masterProperty.findUnique({ where: { masterId } }) : null,
  ]);

  try {
    await uploadDocument({
      agentId: agent?.id ?? null,
      investorId: investor?.id ?? null,
      masterPropertyId: masterProperty?.id ?? null,
      type: String(formData.get("type") ?? "OTHER") as DocumentVaultType,
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? ""),
      uploadedByUserId: session.user.id,
    });
  } catch (error) {
    const code = error instanceof DocumentVaultServiceError ? error.message : "unknown";
    redirect(`/admin/documents?error=${code}`);
  }

  redirect("/admin/documents?saved=1");
}

export async function createAgreementAction(formData: FormData) {
  await requireAdmin();

  const investorCode = String(formData.get("investorCode") ?? "").trim();
  const investor = await prisma.investorProfile.findUnique({ where: { investorCode } });
  if (!investor) redirect("/admin/documents?error=investorNotFound");

  try {
    await createCustomerInvestorAgreement({
      investorId: investor!.id,
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      agreementDate: new Date(String(formData.get("agreementDate") ?? "")),
      lockInPeriodMonths: formData.get("lockInPeriodMonths")
        ? Number(formData.get("lockInPeriodMonths"))
        : null,
      flatUnitNumber: String(formData.get("flatUnitNumber") ?? ""),
      terms: String(formData.get("terms") ?? ""),
      signedCopyUrl: String(formData.get("signedCopyUrl") ?? ""),
    });
  } catch (error) {
    const code = error instanceof DocumentVaultServiceError ? error.message : "unknown";
    redirect(`/admin/documents?error=${code}`);
  }

  redirect("/admin/documents?saved=agreement");
}
