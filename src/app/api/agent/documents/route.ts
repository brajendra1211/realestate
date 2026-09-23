import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { uploadDocument, getDocumentsForAgent, DocumentVaultServiceError } from "@/lib/documentVault";
import { prisma } from "@/lib/prisma";
import type { DocumentVaultType } from "@/generated/prisma";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  const agent = await getAgentByUserId(session.user.id);
  return agent ? { agent, userId: session.user.id } : null;
}

export async function GET() {
  const ctx = await requireAgent();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await getDocumentsForAgent(ctx.agent.id);
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const ctx = await requireAgent();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const masterProperty = body.masterId
    ? await prisma.masterProperty.findUnique({ where: { masterId: String(body.masterId) } })
    : null;

  try {
    const doc = await uploadDocument({
      agentId: ctx.agent.id,
      masterPropertyId: masterProperty?.id ?? null,
      type: (body.type as DocumentVaultType) ?? "OTHER",
      title: String(body.title ?? ""),
      url: String(body.url ?? ""),
      uploadedByUserId: ctx.userId,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentVaultServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
