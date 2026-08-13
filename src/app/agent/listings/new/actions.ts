"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { geocodeLocation } from "@/lib/geocode";

export async function searchMasterProperty(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    redirect("/agent/listings/new?error=notPrime");
  }

  const city = String(formData.get("city") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!city || !address) {
    redirect("/agent/listings/new?error=validation");
  }

  const coords = await geocodeLocation([address, locality, city].filter(Boolean).join(", "));
  if (!coords) {
    redirect(
      `/agent/listings/new?error=geocode&city=${encodeURIComponent(city)}&locality=${encodeURIComponent(locality)}&address=${encodeURIComponent(address)}`
    );
  }

  const params = new URLSearchParams({
    city,
    locality,
    address,
    lat: String(coords.latitude),
    lng: String(coords.longitude),
  });
  redirect(`/agent/listings/new/confirm?${params.toString()}`);
}
