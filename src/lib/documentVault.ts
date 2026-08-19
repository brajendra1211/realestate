import { prisma } from "@/lib/prisma";
import type { DocumentVaultType, PaymentMode } from "@/generated/prisma";

export class DocumentVaultServiceError extends Error {}

export type UploadDocumentInput = {
  masterPropertyId?: string | null;
  dealId?: string | null;
  agentId?: string | null;
  investorId?: string | null;
  type: DocumentVaultType;
  title: string;
  url: string;
  uploadedByUserId: string;
};

// §3.10: "Access is code-scoped: visible only inside the relevant Agent
// Code / Investor Code dashboards." A document with neither owner wouldn't
// be visible anywhere, so at least one is required.
export async function uploadDocument(input: UploadDocumentInput) {
  if (!input.agentId && !input.investorId) {
    throw new DocumentVaultServiceError("noOwner");
  }
  if (!input.title.trim() || !input.url.trim()) {
    throw new DocumentVaultServiceError("validation");
  }

  return prisma.documentVaultItem.create({
    data: {
      masterPropertyId: input.masterPropertyId || null,
      dealId: input.dealId || null,
      agentId: input.agentId || null,
      investorId: input.investorId || null,
      type: input.type,
      title: input.title.trim(),
      url: input.url.trim(),
      uploadedByUserId: input.uploadedByUserId,
    },
  });
}

export async function getDocumentsForAgent(agentProfileId: string) {
  return prisma.documentVaultItem.findMany({
    where: { agentId: agentProfileId },
    include: { masterProperty: { select: { masterId: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentsForInvestor(investorProfileId: string) {
  return prisma.documentVaultItem.findMany({
    where: { investorId: investorProfileId },
    include: { masterProperty: { select: { masterId: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentsForMasterProperty(masterPropertyId: string) {
  return prisma.documentVaultItem.findMany({
    where: { masterPropertyId },
    include: {
      agent: { select: { agentCode: true } },
      investor: { select: { investorCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteDocument(id: string) {
  await prisma.documentVaultItem.delete({ where: { id } });
}

export type CreateAgreementInput = {
  investorId: string;
  customerName: string;
  customerPhone: string;
  agreementDate: Date;
  lockInPeriodMonths?: number | null;
  flatUnitNumber?: string | null;
  terms?: string | null;
  signedCopyUrl: string;
  // Investor → Customer/Property payment leg — distinct from the
  // Investor → Company registration fee leg tracked on InvestorProfile.
  paymentAmount?: number | null;
  paymentMode?: PaymentMode | null;
};

// §3.10's named sub-requirement: "Customer↔Investor agreement records."
export async function createCustomerInvestorAgreement(input: CreateAgreementInput) {
  if (!input.customerName.trim() || !input.customerPhone.trim() || !input.signedCopyUrl.trim()) {
    throw new DocumentVaultServiceError("validation");
  }

  return prisma.customerInvestorAgreement.create({
    data: {
      investorId: input.investorId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      agreementDate: input.agreementDate,
      lockInPeriodMonths: input.lockInPeriodMonths ?? null,
      flatUnitNumber: input.flatUnitNumber?.trim() || null,
      terms: input.terms?.trim() || null,
      signedCopyUrl: input.signedCopyUrl.trim(),
      paymentAmount: input.paymentAmount ?? null,
      paymentMode: input.paymentMode ?? null,
    },
  });
}

export async function getAgreementsForInvestor(investorProfileId: string) {
  return prisma.customerInvestorAgreement.findMany({
    where: { investorId: investorProfileId },
    orderBy: { createdAt: "desc" },
  });
}
