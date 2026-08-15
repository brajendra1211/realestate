import { prisma } from "@/lib/prisma";
import { verifyOtp, requestOtp } from "@/lib/otp";
import { notifyUser } from "@/lib/notify";
import { emitToAgent } from "@/lib/socket";

export class VisitLogServiceError extends Error {}

// §3.8: "Mandatory Mobile + OTP verification before any agent logs a site
// visit for a customer." Reuses the exact same OTP primitives as buyer/
// investor login (src/lib/otp.ts) — an agent triggers the send, the
// customer reads the code off their own phone and reads it back to the agent
// (or types it themselves on a handoff screen), matching how this is done
// in-person at a shop, not a customer self-service login.
export async function requestVisitOtp(customerPhone: string) {
  return requestOtp(customerPhone);
}

// "On OTP verify, the system immediately shows the *new* agent the
// customer's entire cross-agent visit history."
export async function getCustomerVisitHistory(customerPhone: string) {
  return prisma.propertyVisitLog.findMany({
    where: { customerPhone },
    include: {
      agent: { select: { agentCode: true, shopName: true } },
      masterProperty: { select: { masterId: true, city: true, locality: true } },
    },
    orderBy: { visitedAt: "desc" },
  });
}

export type LogVisitInput = {
  agentId: string;
  customerPhone: string;
  customerName?: string | null;
  masterPropertyId: string;
  otp: string;
};

export async function logVisit(input: LogVisitInput) {
  const otpValid = await verifyOtp(input.customerPhone, input.otp);
  if (!otpValid) throw new VisitLogServiceError("invalidOtp");

  const masterProperty = await prisma.masterProperty.findUnique({
    where: { id: input.masterPropertyId },
  });
  if (!masterProperty) throw new VisitLogServiceError("propertyNotFound");

  // Primary Lead Ownership rule (§3.8): the *first* agent this customer
  // viewed this Master Property ID with, permanently — found once, never
  // reassigned even if that original agent's own log is old.
  const earliestVisit = await prisma.propertyVisitLog.findFirst({
    where: { customerPhone: input.customerPhone, masterPropertyId: input.masterPropertyId },
    orderBy: { visitedAt: "asc" },
    include: { agent: { include: { user: { select: { phone: true, email: true } } } } },
  });

  const isConflict = Boolean(earliestVisit && earliestVisit.agentId !== input.agentId);

  const log = await prisma.propertyVisitLog.create({
    data: {
      customerPhone: input.customerPhone,
      customerName: input.customerName?.trim() || null,
      masterPropertyId: input.masterPropertyId,
      agentId: input.agentId,
      otpVerified: true,
      isPrimaryOwner: !earliestVisit || !isConflict,
      conflictWithAgentId: isConflict ? earliestVisit!.agentId : null,
    },
  });

  if (isConflict && earliestVisit) {
    const newAgent = await prisma.agentProfile.findUnique({ where: { id: input.agentId } });
    emitToAgent(earliestVisit.agentId, "visit:conflict", {
      masterPropertyId: input.masterPropertyId,
      masterId: masterProperty.masterId,
      customerPhone: input.customerPhone,
      newAgentCode: newAgent?.agentCode,
    });
    await notifyUser(
      earliestVisit.agent.user,
      `🚨 Conflict Alert: your customer (${maskPhone(input.customerPhone)}) who viewed ${masterProperty.masterId} with you is now viewing it with ${newAgent?.agentCode ?? "another agent"}.`,
      "Duplicate-visit conflict"
    );
  }

  const history = await getCustomerVisitHistory(input.customerPhone);

  return {
    log,
    isConflict,
    originalAgentCode: isConflict ? earliestVisit!.agent.agentCode : null,
    originalVisitDate: isConflict ? earliestVisit!.visitedAt : null,
    history,
  };
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `XXXX${phone.slice(-4)}` : phone;
}

export async function getVisitLogsForAgent(agentProfileId: string) {
  return prisma.propertyVisitLog.findMany({
    where: { agentId: agentProfileId },
    include: { masterProperty: { select: { masterId: true, city: true, locality: true } } },
    orderBy: { visitedAt: "desc" },
  });
}
