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
  if (agent.status !== "APPROVED") {
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
      listingType: "RENT",
      propertyType: String(
        formData.get("propertyType") ?? "APARTMENT"
      ) as CreateAgentListingInput["propertyType"],
      commercialSubtype: String(formData.get("commercialSubtype") ?? "").trim() || null,
      pgGender: String(formData.get("pgGender") ?? "").trim() || null,
      pgSharing: String(formData.get("pgSharing") ?? "").trim() || null,
      foodIncluded: formData.get("foodIncluded") === "on" || formData.get("foodIncluded") === "true",
      furnishing: String(formData.get("furnishing") ?? "").trim() || null,
      floorNumber: formData.get("floorNumber") ? Number(formData.get("floorNumber")) : null,
      totalFloors: formData.get("totalFloors") ? Number(formData.get("totalFloors")) : null,
      carpetAreaSqft: formData.get("carpetAreaSqft") ? Number(formData.get("carpetAreaSqft")) : null,
      superAreaSqft: formData.get("superAreaSqft") ? Number(formData.get("superAreaSqft")) : null,
      facingDirection: String(formData.get("facingDirection") ?? "").trim() || null,
      maintenanceCharges: formData.get("maintenanceCharges") ? Number(formData.get("maintenanceCharges")) : null,
      securityDeposit: formData.get("securityDeposit") ? Number(formData.get("securityDeposit")) : null,
      bachelorFriendly: formData.get("bachelorFriendly") !== "off" && formData.get("bachelorFriendly") !== "false",
      societyName: String(formData.get("societyName") ?? "").trim() || null,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
      bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
      areaSqft: formData.get("areaSqft") ? Number(formData.get("areaSqft")) : null,
      price: Number(formData.get("price") ?? 0),
      exactAddress: String(formData.get("exactAddress") ?? ""),
      // Checkbox grid, not free text — multiple "amenities" entries, so
      // .get() (first value only) would silently drop everything past the
      // first checked box. Matches the comma-separated format the listing
      // detail page already splits on (src/app/listings/[slug]/page.tsx).
      amenities: formData
        .getAll("amenities")
        .map(String)
        .map((v) => v.trim())
        .filter(Boolean)
        .join(", "),
      videoUrl: String(formData.get("videoUrl") ?? "").trim() || null,
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
