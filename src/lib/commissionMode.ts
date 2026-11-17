import { prisma } from "@/lib/prisma";
import type { CommissionType } from "@/generated/prisma";

export function parseTypes(csv: string | null | undefined): Set<string> {
  return new Set((csv ?? "").split(",").map((t) => t.trim()).filter(Boolean));
}

/**
 * Should the system credit this commission to the partner's wallet by itself?
 * False when the admin marked the type as manual globally (Website settings)
 * or for this specific partner (Partners tab). Manual ones are entered by the
 * admin on Commissions → "Credit manually".
 */
export async function canAutoCredit(type: CommissionType, agentId: string): Promise<boolean> {
  const [settings, agent] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { manualCommissionTypes: true } }),
    prisma.agentProfile.findUnique({ where: { id: agentId }, select: { manualCommissionTypes: true } }),
  ]);
  return !parseTypes(settings?.manualCommissionTypes).has(type) && !parseTypes(agent?.manualCommissionTypes).has(type);
}
