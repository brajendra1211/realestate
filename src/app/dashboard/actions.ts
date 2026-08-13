"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { readAmenitiesFromForm } from "@/lib/amenities";
import { getListingUsage } from "@/lib/listing-quota";
import { getLeadUsage } from "@/lib/lead-quota";
import { findOrCreateLocality } from "@/lib/locality";
import { addListingDuration } from "@/lib/propertyVisibility";
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
      | "OFFICE",
    condition: listingType === "SALE" ? readPropertyCondition(formData) : null,
    price: Number(formData.get("price") ?? 0),
    priceNegotiable: formData.get("priceNegotiable") === "on",
    bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
    bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
    areaSqft: formData.get("areaSqft") ? Number(formData.get("areaSqft")) : null,
    city: String(formData.get("city") ?? "").trim(),
    locality,
    address: String(formData.get("address") ?? "").trim() || null,
    amenities: readAmenitiesFromForm(formData),
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

export async function createProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const { ownerId, ownerRole } = await resolveOwnerId(session, formData);

  const usage = await getListingUsage(ownerId, ownerRole);
  if (usage.atLimit) {
    redirect("/dashboard/properties/new?error=limit");
  }

  const fields = await readPropertyFields(formData);
  if (!fields.city) {
    redirect("/dashboard/properties/new?error=location");
  }

  const images = readImages(formData);
  const slug = await uniqueSlug(fields.title);
  const isAdminAuthored = session.user.role === "ADMIN" || session.user.role === "SUBADMIN";

  const property = await prisma.property.create({
    data: {
      ...fields,
      slug,
      ownerId,
      approvalStatus: isAdminAuthored ? "APPROVED" : "PENDING",
      expiresAt: addListingDuration(),
      images: {
        create: images.map(({ url, category, order }) => ({
          url,
          category: category as PropertyImageCategory,
          order,
        })),
      },
    },
  });

  redirect(`/dashboard/properties/${property.id}/edit?saved=1`);
}

export async function updateProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/dashboard");
  if (!isAdminLike(session.user.role) && property!.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  const fields = await readPropertyFields(formData);
  if (!fields.city) {
    redirect(`/dashboard/properties/${id}/edit?error=location`);
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

  redirect(`/dashboard/properties/${id}/edit?saved=1`);
}

export async function deleteProperty(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/dashboard");
  if (!isAdminLike(session.user.role) && property!.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  await prisma.property.delete({ where: { id } });
  redirect("/dashboard");
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
  redirect("/dashboard?renewed=1");
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

  redirect("/dashboard?requested=1");
}

export async function cancelSubscriptionRequest(formData: FormData) {
  const session = await requireListerOrAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.subscription.updateMany({
    where: { id, userId: session.user.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  redirect("/dashboard");
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

  redirect("/dashboard/enquiries");
}
