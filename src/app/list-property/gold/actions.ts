"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { geocodeLocation } from "@/lib/geocode";
import {
  createGoldListingOrder,
  startGoldListingSimulated,
  verifyAndCreateGoldListing,
  GoldListingServiceError,
  type CreateGoldListingInput,
} from "@/lib/goldListing";

export type GoldListingFormInput = Omit<
  CreateGoldListingInput,
  "buyerId" | "latitude" | "longitude" | "exactAddress"
> & {
  address: string;
};

async function requireBuyer() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    redirect(`/buyer/login?next=${encodeURIComponent("/list-property/gold")}`);
  }
  return session;
}

// Customers don't go through the agent's two-step dedup-search — "system
// auto-assigns a Master Property ID" (§3.4) — so geocoding happens inline,
// right before payment, instead of a separate confirm step.
export async function submitGoldListingAction(form: GoldListingFormInput) {
  const session = await requireBuyer();

  const coords = await geocodeLocation(`${form.address}, ${form.city}`);
  if (!coords) {
    throw new Error("Couldn't locate that address. Check it and try again.");
  }

  const input: CreateGoldListingInput = {
    buyerId: session.user.id,
    referredByAgentCode: form.referredByAgentCode,
    title: form.title,
    description: form.description,
    listingType: form.listingType,
    propertyType: form.propertyType,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    areaSqft: form.areaSqft,
    price: form.price,
    city: form.city,
    locality: form.locality,
    latitude: coords.latitude,
    longitude: coords.longitude,
    exactAddress: form.address,
    amenities: form.amenities,
    videoUrl: form.videoUrl,
    images: form.images,
  };

  if (!process.env.RAZORPAY_KEY_ID) {
    const listing = await startGoldListingSimulated(input);
    return { simulated: true as const, slug: listing.slug, input };
  }

  const { order, keyId } = await createGoldListingOrder(input);
  if (!order || !keyId) {
    throw new Error("Payment isn't available right now. Please try again shortly.");
  }
  return { simulated: false as const, order, keyId, input };
}

export async function verifyGoldListingPaymentAction(
  input: CreateGoldListingInput,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  await requireBuyer();

  try {
    const listing = await verifyAndCreateGoldListing(input, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    return { slug: listing.slug };
  } catch (error) {
    if (error instanceof GoldListingServiceError) {
      throw new Error("Payment verification failed. Contact support if you were charged.");
    }
    throw error;
  }
}
