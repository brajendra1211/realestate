import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { createBrochureRechargeOrder } from "@/lib/brochure";

export async function POST() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  try {
    return NextResponse.json(await createBrochureRechargeOrder(g.agent.id));
  } catch (e) {
    return fail(e);
  }
}
