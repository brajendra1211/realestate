import { prisma } from "@/lib/prisma";

export async function generateAgentCode(city: string | null) {
  const prefix = (city ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  const base = `AGT-${prefix}-`;
  let seq = (await prisma.agentProfile.count({ where: { agentCode: { startsWith: base } } })) + 1000;
  let code = `${base}${seq}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.agentProfile.findUnique({ where: { agentCode: code } });
    if (!existing) return code;
    seq += 1;
    code = `${base}${seq}`;
  }
}

export async function generateInvestorCode() {
  let seq = (await prisma.investorProfile.count()) + 1;
  let code = `INV-${String(seq).padStart(6, "0")}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.investorProfile.findUnique({ where: { investorCode: code } });
    if (!existing) return code;
    seq += 1;
    code = `INV-${String(seq).padStart(6, "0")}`;
  }
}
