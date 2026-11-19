"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  adminAssignInterest,
  adminBuzzAreaAgents,
  adminBuzzSelectedAgents,
  BuyerInterestError,
} from "@/lib/buyerInterest";

const PATH = "/admin/buzzer-control";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
}

function back(msg: { ok?: string; err?: string }): never {
  const q = new URLSearchParams();
  if (msg.ok) q.set("ok", msg.ok);
  if (msg.err) q.set("err", msg.err);
  redirect(`${PATH}?${q.toString()}`);
}

/** Buzz only the partners ticked by the admin. */
export async function buzzSelectedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const agentIds = formData.getAll("agentIds").map(String).filter(Boolean);
  if (!id || agentIds.length === 0) back({ err: "Select at least one partner." });
  try {
    const n = await adminBuzzSelectedAgents(id, agentIds);
    revalidatePath(PATH);
    back({ ok: `Buzzed ${n} selected partner(s).` });
  } catch (e) {
    if (e instanceof BuyerInterestError) back({ err: e.message });
    throw e;
  }
}

/** Buzz only the partners mapped to a pincode. */
export async function buzzAreaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pincode = String(formData.get("pincode") ?? "").trim();
  if (!id || !pincode) back({ err: "Enter a pincode." });
  try {
    const n = await adminBuzzAreaAgents(id, pincode);
    revalidatePath(PATH);
    back({ ok: `Buzzed ${n} partner(s) of pincode ${pincode}.` });
  } catch (e) {
    if (e instanceof BuyerInterestError) back({ err: e.message });
    throw e;
  }
}

/** Send the lead straight to one partner — no buzzer rung. */
export async function sendDirectAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  if (!id || !agentId) back({ err: "Pick a partner." });
  await adminAssignInterest(id, agentId);
  revalidatePath(PATH);
  back({ ok: "Lead sent directly to the partner." });
}
