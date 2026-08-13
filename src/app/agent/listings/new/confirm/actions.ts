"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import {
  createAgentListing as createAgentListingService,
  ListingServiceError,
  type CreateAgentListingInput,
} from "@/lib/listing";

export async function submitAgentListing(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    redirect("/agent/listings/new?error=notPrime");
  }

  const masterPropertyId = String(formData.get("masterPropertyId") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const images = formData.getAll("imageUrls").map(String).filter(Boolean);

  const backParams = new URLSearchParams({
    city,
    locality,
    lat: String(latitude),
    lng: String(longitude),
  });

  try {
    await createAgentListingService(agent.id, {
      masterPropertyId,
      city,
      locality,
      latitude,
      longitude,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      listingType: String(formData.get("listingType") ?? "SALE") as CreateAgentListingInput["listingType"],
      propertyType: String(
        formData.get("propertyType") ?? "APARTMENT"
      ) as CreateAgentListingInput["propertyType"],
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
      bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
      areaSqft: formData.get("areaSqft") ? Number(formData.get("areaSqft")) : null,
      price: Number(formData.get("price") ?? 0),
      exactAddress: String(formData.get("exactAddress") ?? ""),
      amenities: String(formData.get("amenities") ?? ""),
      images,
    });
  } catch (error) {
    if (error instanceof ListingServiceError) {
      backParams.set("error", error.message);
      redirect(`/agent/listings/new/confirm?${backParams.toString()}`);
    }
    throw error;
  }

  redirect("/agent/listings?saved=1");
}
