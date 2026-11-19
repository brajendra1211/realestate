import { prisma } from "@/lib/prisma";

/**
 * Per-partner notification switches (Agent app -> Settings).
 *   buzzerAlerts  - off: the partner is never buzzed (buyer leads, owner requests, dispatch).
 *   listingAlerts - off: no alert when a new property is listed near them.
 * Leads stay visible in the partner's own lists; only the alert is skipped.
 */
export type AlertKind = "buzzerAlerts" | "listingAlerts";

export async function filterAgentsByAlert<T extends { agentProfileId: string }>(agents: T[], kind: AlertKind): Promise<T[]> {
  if (agents.length === 0) return agents;
  const allowed = await prisma.agentProfile.findMany({
    where: { id: { in: agents.map((a) => a.agentProfileId) }, [kind]: true },
    select: { id: true },
  });
  const ok = new Set(allowed.map((a) => a.id));
  return agents.filter((a) => ok.has(a.agentProfileId));
}

export async function filterAgentIdsByAlert(ids: string[], kind: AlertKind): Promise<string[]> {
  const kept = await filterAgentsByAlert(ids.map((agentProfileId) => ({ agentProfileId })), kind);
  return kept.map((a) => a.agentProfileId);
}
