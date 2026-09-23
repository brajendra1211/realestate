"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { switchAgent, AgentSwitchServiceError } from "@/lib/agentSwitch";
import { markNoShow, AppointmentServiceError } from "@/lib/appointment";

async function requireBuyer() {
  const session = await auth();
  if (!session) redirect("/buyer/login");
  return session;
}

// "Customer can split/switch agents at will if unsatisfied" — §3.9. The
// customer's phone (not their buyer login) is the key everywhere else in
// the trust system (visit logs, ratings, complaints), so this reads it off
// their own User row rather than requiring re-entry.
export async function switchAgentAction(formData: FormData) {
  const session = await requireBuyer();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.phone) redirect("/buyer/dashboard?switchError=noPhone");

  const fromAgentId = String(formData.get("fromAgentId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const isComplaint = formData.get("isComplaint") === "on";
  const latitude = Number(formData.get("latitude") ?? 0);
  const longitude = Number(formData.get("longitude") ?? 0);

  try {
    await switchAgent({ customerPhone: user.phone, fromAgentId, reason, isComplaint, latitude, longitude });
  } catch (error) {
    const code = error instanceof AgentSwitchServiceError ? error.message : "unknown";
    redirect(`/buyer/dashboard?switchError=${code}`);
  }

  revalidatePath("/buyer/dashboard");
}

// §3.7's no-show escalation — buyer flags an agent who didn't show for a
// scheduled visit, triggering a free re-dispatch to fresh nearby agents.
export async function markNoShowAction(formData: FormData) {
  const session = await requireBuyer();
  const appointmentId = String(formData.get("appointmentId") ?? "");

  try {
    const { escalationDispatchId } = await markNoShow(appointmentId, session.user.id);
    redirect(`/dispatch/${escalationDispatchId}`);
  } catch (error) {
    if (error instanceof AppointmentServiceError) {
      redirect(`/buyer/dashboard?appointmentError=${error.message}`);
    }
    throw error;
  }
}

export async function toggleSavedProperty(formData: FormData) {
  const session = await requireBuyer();
  const propertyId = String(formData.get("propertyId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/buyer/dashboard");
  if (!propertyId) redirect(redirectTo);

  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: session.user.id, propertyId } },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedProperty.create({ data: { userId: session.user.id, propertyId } });
  }

  revalidatePath(redirectTo.split("?")[0]);
}

export async function updateBuyerProfile(formData: FormData) {
  const session = await requireBuyer();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      redirect("/buyer/dashboard?error=email");
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || "Buyer",
      email: email || null,
      phone: phone || null,
    },
  });

  revalidatePath("/buyer/dashboard");
}
