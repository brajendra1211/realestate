import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { generateBookingCode } from "@/lib/codes";
import { createFreeDispatchForEscalation } from "@/lib/dispatch";
import { scheduleAppointmentReminder, cancelAppointmentReminder } from "@/lib/queues/reminderQueue";

export class AppointmentServiceError extends Error {}

const FOLLOW_UP_DAYS = 3;

export type CreateAppointmentInput = {
  buyerId: string;
  agentId: string;
  masterPropertyId?: string | null;
  scheduledAt: Date;
};

// "Shared calendar slot booked between agent & customer for a site visit;
// both get reminders" — §3.7.
export async function createAppointment(input: CreateAppointmentInput) {
  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new AppointmentServiceError("mustBeFuture");
  }

  const agent = await prisma.agentProfile.findUnique({
    where: { id: input.agentId },
    include: { user: { select: { phone: true, email: true } } },
  });
  if (!agent) throw new AppointmentServiceError("agentNotFound");

  const buyer = await prisma.user.findUnique({ where: { id: input.buyerId } });
  if (!buyer) throw new AppointmentServiceError("notFound");

  const appointment = await prisma.visitAppointment.create({
    data: {
      bookingCode: await generateBookingCode(),
      buyerId: input.buyerId,
      agentId: input.agentId,
      masterPropertyId: input.masterPropertyId || null,
      scheduledAt: input.scheduledAt,
    },
  });

  await scheduleAppointmentReminder(appointment.id, input.scheduledAt);

  const when = input.scheduledAt.toLocaleString("en-IN");
  await notifyUser(buyer, `Visit scheduled with ${agent.agentCode} on ${when}. Booking code: ${appointment.bookingCode}.`, "Visit scheduled");
  await notifyUser(agent.user, `New visit scheduled with a customer on ${when}. Booking code: ${appointment.bookingCode}.`, "Visit scheduled");

  return appointment;
}

// BullMQ worker entry point (src/lib/queues/reminderQueue.ts). No-ops if the
// appointment was cancelled/completed before the reminder fired.
export async function sendAppointmentReminder(appointmentId: string) {
  const appointment = await prisma.visitAppointment.findUnique({
    where: { id: appointmentId },
    include: {
      buyer: { select: { phone: true, email: true } },
      agent: { include: { user: { select: { phone: true, email: true } } } },
    },
  });
  if (!appointment || appointment.status !== "SCHEDULED") return;

  const when = appointment.scheduledAt.toLocaleString("en-IN");
  await notifyUser(appointment.buyer, `Reminder: your visit is scheduled for ${when}.`, "Visit reminder");
  await notifyUser(appointment.agent.user, `Reminder: you have a visit scheduled for ${when}.`, "Visit reminder");

  await prisma.visitAppointment.update({ where: { id: appointmentId }, data: { reminderSentAt: new Date() } });
}

export async function markCompleted(appointmentId: string) {
  return prisma.visitAppointment.update({
    where: { id: appointmentId },
    data: {
      status: "COMPLETED",
      followUpDueAt: new Date(Date.now() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

export async function cancelAppointment(appointmentId: string) {
  await cancelAppointmentReminder(appointmentId);
  return prisma.visitAppointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
}

// §3.7's no-show escalation: "if the agent doesn't show/respond on the
// scheduled visit, the customer can escalate to customer care, who
// broadcasts to 5-10 new nearby agents using the customer's existing
// unique booking code." Buyer-only, and only once the scheduled time has
// actually passed (can't flag a no-show for a visit that hasn't happened
// yet).
export async function markNoShow(appointmentId: string, buyerId: string) {
  const appointment = await prisma.visitAppointment.findUnique({
    where: { id: appointmentId },
    include: { masterProperty: true },
  });
  if (!appointment || appointment.buyerId !== buyerId) throw new AppointmentServiceError("notFound");
  if (appointment.status !== "SCHEDULED") throw new AppointmentServiceError("notScheduled");
  if (appointment.scheduledAt.getTime() > Date.now()) throw new AppointmentServiceError("notYetDue");
  if (!appointment.masterProperty) throw new AppointmentServiceError("noLocation");

  await cancelAppointmentReminder(appointmentId);
  const updated = await prisma.visitAppointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW" },
  });

  const escalation = await createFreeDispatchForEscalation(
    buyerId,
    appointment.masterProperty.latitude,
    appointment.masterProperty.longitude,
    appointment.agentId
  );

  return { appointment: updated, escalationDispatchId: escalation.id };
}

// `isDue` is computed here (not in the calling page component) so the
// buyer-dashboard Server Component never calls Date.now() itself — an
// impure call inside a component body, even a server one, breaks React's
// purity rule.
export async function getAppointmentsForBuyer(buyerId: string) {
  const appointments = await prisma.visitAppointment.findMany({
    where: { buyerId },
    include: { agent: { select: { agentCode: true, shopName: true } }, masterProperty: { select: { masterId: true } } },
    orderBy: { scheduledAt: "desc" },
  });
  const now = Date.now();
  return appointments.map((appt) => ({ ...appt, isDue: appt.scheduledAt.getTime() <= now }));
}

export async function getAppointmentsForAgent(agentProfileId: string) {
  return prisma.visitAppointment.findMany({
    where: { agentId: agentProfileId },
    include: { buyer: { select: { name: true, phone: true } }, masterProperty: { select: { masterId: true } } },
    orderBy: { scheduledAt: "desc" },
  });
}
