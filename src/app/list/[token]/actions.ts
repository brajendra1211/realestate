"use server";

import { submitOwnerListing, ListingRequestError, type OwnerListingInput } from "@/lib/listingRequest";
import { ListingServiceError } from "@/lib/listing";

export type OwnerListingForm = {
  title: string;
  description: string;
  propertyType: OwnerListingInput["propertyType"];
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  price: number;
  securityDeposit: number | null;
  maintenanceCharges: number | null;
  furnishing: string | null;
  societyName: string | null;
  locality: string | null;
  exactAddress: string;
  amenities: string | null;
  videoUrl: string | null;
  bachelorFriendly: boolean;
  images: string[];
};

export async function submitOwnerListingAction(token: string, form: OwnerListingForm) {
  if (form.images.length === 0) throw new Error("Please add at least one photo of the property.");
  try {
    const listing = await submitOwnerListing(token, {
      title: form.title,
      description: form.description,
      propertyType: form.propertyType,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      areaSqft: form.areaSqft,
      price: form.price,
      securityDeposit: form.securityDeposit,
      maintenanceCharges: form.maintenanceCharges,
      furnishing: form.furnishing,
      societyName: form.societyName,
      locality: form.locality,
      exactAddress: form.exactAddress,
      amenities: form.amenities,
      videoUrl: form.videoUrl,
      bachelorFriendly: form.bachelorFriendly,
      images: form.images,
    });
    return { slug: listing.slug };
  } catch (error) {
    if (error instanceof ListingRequestError) throw new Error(error.message);
    if (error instanceof ListingServiceError) {
      throw new Error(
        error.message === "validation" || error.message === "noLocation"
          ? "Please check the details you entered (title, description, address and rent are required)."
          : error.message,
      );
    }
    throw error;
  }
}
