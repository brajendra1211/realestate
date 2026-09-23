import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getInvestorsForAgent, registerInvestor, InvestorServiceError } from "@/lib/investor";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investors = await getInvestorsForAgent(agent.id);
  return NextResponse.json(investors);
}

export async function POST(request: Request) {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return NextResponse.json({ error: "notPrime" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const user = await registerInvestor(agent.id, {
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
    });
    return NextResponse.json(
      { userId: user.id, investorProfileId: user.investorProfile!.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Investor registration failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
