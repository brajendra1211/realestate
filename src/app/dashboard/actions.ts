"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { readAmenitiesFromForm } from "@/lib/amenities";
import { getListingUsage, getActiveSubscription } from "@/lib/listing-quota";
import { getLeadUsage } from "@/lib/lead-quota";
import { findOrCreateLocality } from "@/lib/locality";
import { addListingDuration } from "@/lib/propertyVisibility";
import { activateOwnerPlan } from "@/lib/ownerPlans";
import { geocodeWithFallback } from "@/lib/geocode";
import { getNearbyAmenities, formatAmenitiesNote } from "@/lib/amenityLookup";
import type { PropertyImageCategory } from "@/generated/prisma/client";

async function requireListerOrAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

function isAdminLike(role: string) {
  return role === "ADMIN" || role === "SUBADMIN";
}

async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title) || "property";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.property.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function readImages(formData: FormData) {
  const urls = formData.getAll("imageUrls").map(String);
  const categories = formData.getAll("imageCategories").map(String);
  return urls
    .map((url, index) => ({ url, category: categories[index] || "OTHER", order: index }))
    .filter((image) => image.url);
}

function readPropertyCondition(formData: FormData): "NEW_BOOKING" | "RESALE" | null {
  const raw = String(formData.get("condition") ?? "");
  return raw === "NEW_BOOKING" || raw === "RESALE" ? raw : null;
}

function readManualCoords(formData: FormData) {
  const latitude = Number(formData.get("newLocalityLatitude"));
  const longitude = Number(formData.get("newLocalityLongitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

async function resolveLocalityName(formData: FormData) {
  const cityId = String(formData.get("cityId") ?? "").trim();
  const newLocalityName = String(formData.get("newLocalityName") ?? "").trim();

  if (newLocalityName && cityId) {
    const locality = await findOrCreateLocality(newLocalityName, cityId, readManualCoords(formData));
    if (locality) return locality.name;
  }

  return String(formData.get("locality") ?? "").trim() || null;
}

async function readPropertyFields(formData: FormData) {
  const listingType = String(formData.get("listingType") ?? "SALE") as "SALE" | "RENT";
  const locality = await resolveLocalityName(formData);
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;

  // Best-effort, same geocode-then-Overpass pipeline agent/Gold listings
  // already use (src/lib/listing.ts, src/lib/goldListing.ts) — a plain
  // website Property never had lat/long at all before this, so nearby
  // hospital/school/highway/petrol-pump tagging was never possible for it.
  // Never blocks listing creation: on any failure these just stay null.
  let latitude: number | null = null;
  let longitude: number | null = null;
  let nearbyAmenities: string | null = null;
  const coords = await geocodeWithFallback([address, locality, city]).catch(() => null);
  if (coords) {
    latitude = coords.latitude;
    longitude = coords.longitude;
    const nearby = await getNearbyAmenities(coords.latitude, coords.longitude);
    nearbyAmenities = formatAmenitiesNote(nearby);
  }

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    listingType,
    propertyType: String(formData.get("propertyType") ?? "APARTMENT") as
      | "APARTMENT"
      | "VILLA"
      | "INDEPENDENT_HOUSE"
      | "PLOT"
      | "COMMERCIAL"
      | "OFFICE"
      | "SHOP"
      | "WAREHOUSE"
      | "PG",
    condition: listingType === "SALE" ? readPropertyCondition(formData) : null,
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
    possessionStatus: String(formData.get("possessionStatus") ?? "").trim() || null,
    bachelorFriendly: formData.get("bachelorFriendly") !== "off" && formData.get("bachelorFriendly") !== "false",
    reraNumber: String(formData.get("reraNumber") ?? "").trim() || null,
    societyName: String(formData.get("societyName") ?? "").trim() || null,
    specifications: String(formData.get("specifications") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0),
    priceNegotiable: formData.get("priceNegotiable") === "on",
    bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
    bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
    areaSqft: formData.get("areaSqft") ? Number(formData.get("areaSqft")) : null,
    city,
    locality,
    address,
    latitude,
    longitude,
    amenities: readAmenitiesFromForm(formData),
    nearbyAmenities,
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
    projectId: String(formData.get("projectId") ?? "").trim() || null,
    brochureUrl: String(formData.get("brochureUrl") ?? "").trim() || null,
    youtubeUrl: String(formData.get("youtubeUrl") ?? "").trim() || null,
  };
}

// ADMIN/SUBADMIN can list a property under an existing DEALER/OWNER account instead of their own.
async function resolveOwnerId(session: { user: { id: string; role: string } }, formData: FormData) {
  if (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN") {
    return { ownerId: session.user.id, ownerRole: session.user.role };
  }

  const onBehalfOfUserId = String(formData.get("onBehalfOfUserId") ?? "").trim();
  if (!onBehalfOfUserId) {
    return { ownerId: session.user.id, ownerRole: session.user.role };
  }

  const target = await prisma.user.findUnique({ where: { id: onBehalfOfUserId } });
  if (!target || (target.role !== "DEALER" && target.role !== "OWNER")) {
    return { ownerId: session.user.id, ownerRole: session.user.role };
  }

  return { ownerId: target.id, ownerRole: target.role };
}

export async function createProperty(formData: FormData): Promise<{ redirectTo?: string } | void> {
  const session = await requireListerOrAdmin();
  // Owners and dealers cannot publish listings themselves any more — a channel
  // partner creates them through the paid owner-request flow.
  if (session.user.role === "OWNER" || session.user.role === "DEALER") {
    return { redirectTo: "/list-property/request" };
  }
  const { ownerId, ownerRole } = await resolveOwnerId(session, formData);

  // The admin works inside the admin console; everyone else stays in the owner dashboard.
  const base = session.user.role === "ADMIN" ? "/admin/properties" : "/dashboard/properties";

  const usage = await getListingUsage(ownerId, ownerRole);
  if (usage.atLimit) {
    redirect(`${base}/new?error=limit`);
  }

  const fields = await readPropertyFields(formData);
  const isAdminAuthored = session.user.role === "ADMIN" || session.user.role === "SUBADMIN";

  if (!isAdminAuthored && fields.listingType === "SALE") {
    redirect(`${base}/new?error=sale_admin_only`);
  }

  if (!fields.city) {
    redirect(`${base}/new?error=location`);
  }

  const images = readImages(formData);
  const slug = await uniqueSlug(fields.title);

  const activeSub = await getActiveSubscription(ownerId);
  const durationDays = activeSub?.plan?.durationDays ?? (activeSub?.plan?.name?.toLowerCase().includes("gold") ? 90 : 30);
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const property = await prisma.property.create({
    data: {
      ...fields,
      slug,
      ownerId,
      approvalStatus: isAdminAuthored ? "APPROVED" : "PENDING",
      expiresAt,
      images: {
        create: images.map(({ url, category, order }) => ({
          url,
          category: category as PropertyImageCategory,
          order,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/properties");
  return { redirectTo: `${base}/${property.id}/edit?saved=1` };
}

export async function updateProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const homeHref = session.user.role === "ADMIN" ? "/admin/properties" : "/dashboard";
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect(homeHref);
  if (!isAdminLike(session.user.role) && property!.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  const fields = await readPropertyFields(formData);
  if (!fields.city) {
    const editBase = session.user.role === "ADMIN" ? "/admin/properties" : "/dashboard/properties";
    redirect(`${editBase}/${id}/edit?error=location`);
  }

  // A failed re-geocode on update (Nominatim/Overpass hiccup, or the
  // address didn't change) shouldn't wipe out coordinates/nearby-amenity
  // data a previous save already got successfully.
  if (fields.latitude == null && property!.latitude != null) {
    fields.latitude = property!.latitude;
    fields.longitude = property!.longitude;
    fields.nearbyAmenities = property!.nearbyAmenities;
  }

  const images = readImages(formData);
  const slug = fields.title !== property!.title ? await uniqueSlug(fields.title, id) : property!.slug;

  await prisma.$transaction([
    prisma.propertyImage.deleteMany({ where: { propertyId: id } }),
    prisma.property.update({
      where: { id },
      data: {
        ...fields,
        slug,
        approvalStatus: isAdminLike(session.user.role) ? property!.approvalStatus : "PENDING",
        images: {
          create: images.map(({ url, category, order }) => ({
            url,
            category: category as PropertyImageCategory,
            order,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/dashboard/properties/${id}/edit`);
  revalidatePath(`/admin/properties/${id}/edit`);
  revalidatePath("/admin/properties");
}

export async function deleteProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const homeHref = session.user.role === "ADMIN" ? "/admin/properties" : "/dashboard";
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect(homeHref);
  if (!isAdminLike(session.user.role) && property!.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  await prisma.property.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/admin/properties");
  redirect(homeHref);
}

export async function renewProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/dashboard");
  if (!isAdminLike(session.user.role) && property!.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  await prisma.property.update({
    where: { id },
    data: { expiresAt: addListingDuration() },
  });
  revalidatePath("/dashboard");
}

export async function requestSubscription(formData: FormData) {
  const session = await requireListerOrAdmin();
  if (session.user.role !== "OWNER" && session.user.role !== "DEALER") {
    redirect("/dashboard");
  }

  const planId = String(formData.get("planId") ?? "");
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active || (plan.role !== "BOTH" && plan.role !== session.user.role)) {
    redirect("/dashboard?error=plan");
  }

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: session.user.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    }),
    prisma.subscription.create({
      data: { userId: session.user.id, planId, status: "PENDING", amount: plan!.price },
    }),
  ]);

  revalidatePath("/dashboard");
}

export async function cancelSubscriptionRequest(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.subscription.updateMany({
    where: { id, userId: session.user.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/dashboard");
}

export async function revealLead(formData: FormData) {
  const session = await requireListerOrAdmin();
  const enquiryId = String(formData.get("enquiryId") ?? "");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { property: { select: { ownerId: true } } },
  });
  if (!enquiry || !enquiry.property || enquiry.property.ownerId !== session.user.id) {
    redirect("/dashboard/enquiries");
  }

  const alreadyViewed = await prisma.leadView.findUnique({
    where: { userId_enquiryId: { userId: session.user.id, enquiryId } },
  });

  if (!alreadyViewed && session.user.role !== "ADMIN") {
    const usage = await getLeadUsage(session.user.id, session.user.role);
    if (usage.atLimit) {
      redirect("/dashboard/enquiries?error=limit");
    }
  }

  if (!alreadyViewed) {
    await prisma.leadView.create({ data: { userId: session.user.id, enquiryId } });
  }

  revalidatePath("/dashboard/enquiries");
}

export async function chooseOwnerPlanAction(formData: FormData) {
  const session = await requireListerOrAdmin();
  const planTier = String(formData.get("planTier") ?? "BASIC") as "BASIC" | "GOLD";
  await activateOwnerPlan(session.user.id, planTier);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/properties/new");
  redirect("/dashboard/properties/new?planActivated=1");
}

export async function markRentalDealAction(formData: FormData) {
  const session = await requireListerOrAdmin();
  const propertyId = String(formData.get("propertyId") ?? "");
  const agentId = String(formData.get("agentId") ?? "").trim();
  const rentAmount = Number(formData.get("rentAmount") ?? 0);
  const tenantName = String(formData.get("tenantName") ?? "").trim() || null;
  const tenantPhone = String(formData.get("tenantPhone") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!propertyId || !agentId || rentAmount <= 0) {
    redirect("/dashboard?error=invalidRentalInput");
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || (property.ownerId !== session.user.id && !isAdminLike(session.user.role))) {
    redirect("/dashboard?error=unauthorized");
  }

  const { recordRentalDeal } = await import("@/lib/deal");
  await recordRentalDeal({
    propertyId,
    agentId,
    rentAmount,
    tenantName,
    tenantPhone,
    note,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/deals");
  revalidatePath("/admin/partners");
  revalidatePath("/admin/properties");
  revalidatePath(`/properties/${property.slug}`);
  redirect("/dashboard?rentalClosed=1");
}

export async function relistPropertyAction(formData: FormData) {
  const session = await requireListerOrAdmin();
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || (property.ownerId !== session.user.id && !isAdminLike(session.user.role))) {
    redirect("/dashboard?error=unauthorized");
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { status: "AVAILABLE" },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/properties/${property.slug}`);
  redirect("/dashboard?relisted=1");
}

