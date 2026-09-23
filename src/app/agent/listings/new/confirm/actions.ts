"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import {
  createAgentListing as createAgentListingService,
  ListingServiceError,
  type CreateAgentListingInput,
} from "@/lib/listing";

export type SubmitAgentListingState = { error?: string; redirectTo?: string };

export async function submitAgentListing(
  _prevState: SubmitAgentListingState,
  formData: FormData
): Promise<SubmitAgentListingState> {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return { error: "notPrime" };
  }

  const masterPropertyId = String(formData.get("masterPropertyId") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const images = formData.getAll("imageUrls").map(String).filter(Boolean);

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
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/agent/listings");
  return { redirectTo: "/agent/listings?saved=1" };
}
