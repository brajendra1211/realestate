"use server";

import { submitOwnerListing, getRequestByFormToken, ListingRequestError, type OwnerListingInput } from "@/lib/listingRequest";
import { geocodeWithFallback } from "@/lib/geocode";
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
  /** GPS position; when missing the address is looked up on the map instead. */
  latitude: number | null;
  longitude: number | null;
  videoUrl: string | null;
  bachelorFriendly: boolean;
  images: string[];
};

export async function submitOwnerListingAction(token: string, form: OwnerListingForm) {
  if (form.images.length === 0) throw new Error("Please add at least one photo of the property.");
  let latitude = form.latitude;
  let longitude = form.longitude;
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const request = await getRequestByFormToken(token);
    const found = await geocodeWithFallback([form.exactAddress, form.locality, request?.city]);
    if (!found) {
      throw new Error("We couldn't find your location. Turn on GPS and stand at the property, or add the area and city to the address.");
    }
    latitude = found.latitude;
    longitude = found.longitude;
  }
  try {
    const result = await submitOwnerListing(token, {
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
      latitude,
      longitude,
      images: form.images,
    });
    return { id: result.id, statusToken: result.statusToken };
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
