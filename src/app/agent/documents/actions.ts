"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { uploadDocument, deleteDocument, DocumentVaultServiceError } from "@/lib/documentVault";
import { prisma } from "@/lib/prisma";
import type { DocumentVaultType } from "@/generated/prisma";

export async function uploadAgentDocumentAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const masterId = String(formData.get("masterId") ?? "").trim();
  let masterPropertyId: string | null = null;
  if (masterId) {
    const masterProperty = await prisma.masterProperty.findUnique({ where: { masterId } });
    masterPropertyId = masterProperty?.id ?? null;
  }

  try {
    await uploadDocument({
      agentId: agent.id,
      masterPropertyId,
      type: String(formData.get("type") ?? "OTHER") as DocumentVaultType,
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? ""),
      uploadedByUserId: session.user.id,
    });
  } catch (error) {
    const code = error instanceof DocumentVaultServiceError ? error.message : "unknown";
    redirect(`/agent/documents?error=${code}`);
  }

  revalidatePath("/agent/documents");
}

export async function deleteAgentDocumentAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const id = String(formData.get("id") ?? "");
  const doc = await prisma.documentVaultItem.findUnique({ where: { id } });
  if (doc && doc.agentId === agent.id) {
    await deleteDocument(id);
  }
  revalidatePath("/agent/documents");
}
