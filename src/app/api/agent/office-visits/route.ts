import { NextResponse } from "next/server";
import { requireAgentApi } from "@/lib/agentApi";
import { getOfficeVisitHistory, getOfficeVisitSummary } from "@/lib/officeVisit";

// Partner's own office-visit status: last visit date + history.
export async function GET() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const [summary, history] = await Promise.all([getOfficeVisitSummary(g.agent.id), getOfficeVisitHistory(g.agent.id)]);
  return NextResponse.json({
    lastVisitAt: summary.last?.visitedAt ?? null,
    lastVisitNotes: summary.last?.notes ?? null,
    totalVisits: summary.total,
    history: history.map((v) => ({
      id: v.id,
      visited: v.visited,
      visitedAt: v.visitedAt,
      notes: v.notes,
      visitors: v.visitors.map((p) => ({ name: p.name, relation: p.relation, interest: p.interest })),
    })),
  });
}
