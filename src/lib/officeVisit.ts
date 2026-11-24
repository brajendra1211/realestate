import { prisma } from "@/lib/prisma";

export class OfficeVisitError extends Error {}

export const VISITOR_RELATIONS = ["CLIENT", "INVESTOR", "FRIEND", "RELATIVE"] as const;
export const VISITOR_INTERESTS = ["BUY", "INVESTMENT", "GENERAL"] as const;

export type VisitorInput = { name: string; mobile: string; relation?: string; interest?: string };

export function cleanMobile(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function logOfficeVisit(input: {
  agentCode: string;
  visited: boolean;
  visitedAt?: Date | null;
  notes?: string | null;
  visitors?: VisitorInput[];
  staff: { id: string; name: string };
}) {
  const code = input.agentCode.trim().toUpperCase();
  if (!code) throw new OfficeVisitError("Enter the agent code.");
  const agent = await prisma.agentProfile.findFirst({
    where: { agentCode: code },
    select: { id: true, agentCode: true, user: { select: { name: true } } },
  });
  if (!agent) throw new OfficeVisitError(`No agent found with code ${code}.`);

  const when = input.visitedAt && !isNaN(input.visitedAt.getTime()) ? input.visitedAt : new Date();
  const visitors = (input.visitors ?? [])
    .map((v) => ({
      name: v.name.trim(),
      mobile: cleanMobile(v.mobile),
      relation: (VISITOR_RELATIONS as readonly string[]).includes(v.relation ?? "") ? v.relation! : "CLIENT",
      interest: (VISITOR_INTERESTS as readonly string[]).includes(v.interest ?? "") ? v.interest! : "GENERAL",
    }))
    .filter((v) => v.name || v.mobile);
  for (const v of visitors) {
    if (!v.name) throw new OfficeVisitError("Every visitor needs a name.");
    if (v.mobile.length !== 10) throw new OfficeVisitError(`Visitor "${v.name}" needs a valid 10-digit mobile number.`);
  }

  const visit = await prisma.agentOfficeVisit.create({
    data: {
      agentId: agent.id,
      visited: input.visited,
      visitedAt: when,
      notes: input.notes?.trim() || null,
      markedById: input.staff.id,
      markedByName: input.staff.name,
      visitors: {
        create: visitors.map((v) => ({ ...v, agentId: agent.id, visitedAt: when })),
      },
    },
  });
  return { visit, agent };
}

/** Latest "Yes" office visit for the partner dashboard, plus total count. */
export async function getOfficeVisitSummary(agentId: string) {
  const [last, total] = await Promise.all([
    prisma.agentOfficeVisit.findFirst({
      where: { agentId, visited: true },
      orderBy: { visitedAt: "desc" },
      include: { visitors: true },
    }),
    prisma.agentOfficeVisit.count({ where: { agentId, visited: true } }),
  ]);
  return { last, total };
}

export async function getOfficeVisitHistory(agentId: string, take = 30) {
  return prisma.agentOfficeVisit.findMany({
    where: { agentId },
    orderBy: { visitedAt: "desc" },
    take,
    include: { visitors: true },
  });
}
