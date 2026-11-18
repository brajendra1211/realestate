"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createDispatchOrder,
  startDispatchSimulated,
  verifyAndStartDispatch,
  acceptDispatch,
  cancelDispatch,
  DispatchServiceError,
  BUZZER_ERROR_TEXT,
  type CreateDispatchInput,
} from "@/lib/dispatch";
import { getAgentByUserId } from "@/lib/agent";
import { isRazorpayConfigured } from "@/lib/razorpay";

async function requireBuyer() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    redirect(`/buyer/login?next=${encodeURIComponent("/dispatch/new")}`);
  }
  return session;
}

// Called from the client DispatchTrigger component. Branches the same way
// UnlockButton/createUnlockOrderAction does: Razorpay configured → return an
// order for Checkout to open; not configured → start the simulated flow and
// return the new dispatch's id directly.
export type DispatchFormInput = Pick<
  CreateDispatchInput,
  "purpose" | "radiusKm" | "societyName" | "bhk" | "budgetMin" | "budgetMax" | "budgetLabel"
>;

export async function requestDispatchAction(latitude: number, longitude: number, form: DispatchFormInput = {}) {
  const session = await requireBuyer();
  const input = { buyerId: session.user.id, latitude, longitude, ...form };

  try {
    if (!isRazorpayConfigured()) {
      const dispatch = await startDispatchSimulated(input);
      return { ok: true as const, simulated: true as const, dispatchRequestId: dispatch.id };
    }

    const { order, keyId } = await createDispatchOrder(input);
    if (!order || !keyId) {
      return { ok: false as const, error: "Payment isn't available right now. Please try again shortly." };
    }
    return { ok: true as const, simulated: false as const, order, keyId };
  } catch (error) {
    if (error instanceof DispatchServiceError) {
      return { ok: false as const, error: BUZZER_ERROR_TEXT[error.message] ?? "Could not start. Please try again." };
    }
    throw error;
  }
}

export async function verifyDispatchPaymentAction(input: {
  latitude: number;
  longitude: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  form?: DispatchFormInput;
}) {
  const session = await requireBuyer();

  const dispatch = await verifyAndStartDispatch(
    { buyerId: session.user.id, latitude: input.latitude, longitude: input.longitude, ...(input.form ?? {}) },
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature
  );
  return { dispatchRequestId: dispatch.id };
}

export async function acceptDispatchAction(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const dispatchRequestId = String(formData.get("dispatchRequestId") ?? "");

  try {
    await acceptDispatch(dispatchRequestId, agent.id);
  } catch (error) {
    const code = error instanceof DispatchServiceError ? error.message : "unknown";
    redirect(`/agent/dashboard?dispatchError=${code}`);
  }

  redirect(`/agent/dispatch/${dispatchRequestId}`);
}

export async function cancelDispatchAction(formData: FormData) {
  const session = await requireBuyer();
  const dispatchRequestId = String(formData.get("dispatchRequestId") ?? "");

  try {
    await cancelDispatch(dispatchRequestId, session.user.id);
  } catch {
    // Already resolved/not cancellable — nothing to surface, the radar page
    // will show the current real status on next render regardless.
  }

  revalidatePath(`/dispatch/${dispatchRequestId}`);
}
