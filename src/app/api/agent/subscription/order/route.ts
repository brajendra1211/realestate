import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { createPlanOrder } from "@/lib/agentRegistrationPayment";

// Body: { planId, mode: "register" | "upgrade" } -> Razorpay order for the plan.
export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const { planId, mode } = (await request.json().catch(() => ({}))) as { planId?: string; mode?: "register" | "upgrade" };
  if (!planId) return fail(null, "Missing plan");
  try {
    return NextResponse.json(await createPlanOrder(g.agent.id, planId, mode === "upgrade" ? "upgrade" : "register"));
  } catch (e) {
    return fail(e);
  }
}
