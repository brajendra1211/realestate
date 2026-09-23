import { NextResponse } from "next/server";
import { getAgentPlans } from "@/lib/agentPlans";

export async function GET() {
  try {
    const plans = await getAgentPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch agent plans", error);
    return NextResponse.json({ error: "Failed to fetch agent plans" }, { status: 500 });
  }
}
