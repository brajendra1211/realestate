import { NextResponse } from "next/server";
import { submitAgentApplication, AgentServiceError, type AgentDocumentInput } from "@/lib/agent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const user = await submitAgentApplication({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : null,
      alternatePhone: body.alternatePhone ? String(body.alternatePhone) : null,
      password: String(body.password ?? ""),
      shopName: String(body.shopName ?? ""),
      shopAddress: String(body.shopAddress ?? ""),
      city: String(body.city ?? ""),
      yearsExperience: body.yearsExperience != null ? Number(body.yearsExperience) : null,
      staffCount: body.staffCount != null ? Number(body.staffCount) : null,
      reraNumber: body.reraNumber ? String(body.reraNumber) : null,
      gstNumber: body.gstNumber ? String(body.gstNumber) : null,
      documents: Array.isArray(body.documents) ? (body.documents as AgentDocumentInput[]) : [],
      referredByAgentCode: body.referredByAgentCode ? String(body.referredByAgentCode) : null,
    });

    return NextResponse.json(
      { userId: user.id, agentProfileId: user.agentProfile!.id, status: user.agentProfile!.status },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AgentServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Agent registration failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
