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

// "The customer's existing unique booking code" — §3.7. Same sequential
// pattern as every other code in this file.
export async function generateBookingCode() {
  let seq = (await prisma.visitAppointment.count()) + 1;
  let code = `BK-${String(seq).padStart(6, "0")}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.visitAppointment.findUnique({ where: { bookingCode: code } });
    if (!existing) return code;
    seq += 1;
    code = `BK-${String(seq).padStart(6, "0")}`;
  }
}

export async function generateMasterPropertyId(city: string | null) {
  const prefix = (city ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  const year = new Date().getFullYear();
  const base = `PROP-${prefix}-${year}-`;
  let seq = (await prisma.masterProperty.count({ where: { masterId: { startsWith: base } } })) + 1000;
  let id = `${base}${seq}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.masterProperty.findUnique({ where: { masterId: id } });
    if (!existing) return id;
    seq += 1;
    id = `${base}${seq}`;
  }
}
