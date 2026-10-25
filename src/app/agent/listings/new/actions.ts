"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { geocodeWithFallback } from "@/lib/geocode";

export type SearchMasterPropertyState = { error?: string; redirectTo?: string };

export async function searchMasterProperty(
  _prevState: SearchMasterPropertyState,
  formData: FormData
): Promise<SearchMasterPropertyState> {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return { error: "notPrime" };
  }

  const city = String(formData.get("city") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!city || !address) {
    return { error: "validation" };
  }

  // Exact house/shop-level addresses rarely resolve on Nominatim's first
  // try — geocodeWithFallback progressively drops down to locality/city
  // instead of failing outright, same fix already applied to agent shop
  // registration and the listing dedup-search (src/lib/geocode.ts).
  const coords = await geocodeWithFallback([address, locality, city]);
  if (!coords) {
    return { error: "geocode" };
  }

  const params = new URLSearchParams({
    city,
    locality,
    address,
    lat: String(coords.latitude),
    lng: String(coords.longitude),
  });
  return { redirectTo: `/agent/listings/new/confirm?${params.toString()}` };
}
