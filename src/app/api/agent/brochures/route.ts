import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { createBrochure, BROCHURE_PACK_CREDITS, BROCHURE_PACK_PRICE } from "@/lib/brochure";
import { absoluteUrl } from "@/lib/seo";

export async function GET() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const brochures = await prisma.brochure.findMany({
    where: { agentId: g.agent.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, sourceRef: true, createdAt: true },
  });
  return NextResponse.json({
    credits: g.agent.brochureCredits,
    packPrice: BROCHURE_PACK_PRICE,
    packCredits: BROCHURE_PACK_CREDITS,
    brochures: brochures.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), url: absoluteUrl(`/agent/brochures/${b.id}`) })),
  });
}

// Body: { property: "<listing link, slug or code>" }. Uses one credit.
export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const { property } = (await request.json().catch(() => ({}))) as { property?: string };
  try {
    const b = await createBrochure(g.agent.id, String(property ?? ""));
    return NextResponse.json({ id: b.id, title: b.title, url: absoluteUrl(`/agent/brochures/${b.id}`) }, { status: 201 });
  } catch (e) {
    return fail(e, "Could not create the brochure.");
  }
}
