"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { geocodeLocation } from "@/lib/geocode";
import { readAmenitiesFromForm } from "@/lib/amenities";
import { uniqueLocalitySlug } from "@/lib/locality";
import { notifyUser } from "@/lib/notify";
import { hashPassword } from "@/lib/password";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

async function uniqueDeveloperSlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "developer";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.developer.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function uniqueProjectSlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "project";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function uniqueCountrySlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "country";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.country.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function uniqueStateSlug(name: string, countryId: string, ignoreId?: string) {
  const base = slugify(name) || "state";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.state.findUnique({
      where: { countryId_slug: { countryId, slug } },
    });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function uniqueCitySlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "city";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.city.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function createDeveloper(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = await uniqueDeveloperSlug(name);

  const developer = await prisma.developer.create({
    data: {
      name,
      slug,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      about: String(formData.get("about") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      locality: String(formData.get("locality") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
      verified: formData.get("verified") === "on",
      metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
      metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
    },
  });

  redirect(`/admin/developers/${developer.id}/edit?saved=1`);
}

export async function updateDeveloper(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const developer = await prisma.developer.findUnique({ where: { id } });
  if (!developer) redirect("/admin/developers");

  const name = String(formData.get("name") ?? "").trim();
  const slug = name !== developer.name ? await uniqueDeveloperSlug(name, id) : developer.slug;

  await prisma.developer.update({
    where: { id },
    data: {
      name,
      slug,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      about: String(formData.get("about") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      locality: String(formData.get("locality") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
      verified: formData.get("verified") === "on",
      metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
      metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
    },
  });

  redirect(`/admin/developers/${id}/edit?saved=1`);
}

export async function deleteDeveloper(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.developer.delete({ where: { id } });
  redirect("/admin/developers");
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const developerId = String(formData.get("developerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = await uniqueProjectSlug(name);
  const images = formData.getAll("images").map(String).filter(Boolean);

  const project = await prisma.project.create({
    data: {
      developerId,
      name,
      slug,
      description: String(formData.get("description") ?? "").trim(),
      status: String(formData.get("status") ?? "UPCOMING") as
        | "UPCOMING"
        | "UNDER_CONSTRUCTION"
        | "READY_TO_MOVE",
      city: String(formData.get("city") ?? "").trim(),
      locality: String(formData.get("locality") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      priceMin: formData.get("priceMin") ? Number(formData.get("priceMin")) : null,
      priceMax: formData.get("priceMax") ? Number(formData.get("priceMax")) : null,
      possessionDate: formData.get("possessionDate")
        ? new Date(String(formData.get("possessionDate")))
        : null,
      amenities: readAmenitiesFromForm(formData),
      reraNumber: String(formData.get("reraNumber") ?? "").trim() || null,
      metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
      metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
      images: { create: images.map((url, order) => ({ url, order })) },
    },
  });

  redirect(`/admin/developers/${developerId}/projects/${project.id}/edit?saved=1`);
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const developerId = String(formData.get("developerId") ?? "");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) redirect(`/admin/developers/${developerId}/edit`);

  const name = String(formData.get("name") ?? "").trim();
  const slug = name !== project!.name ? await uniqueProjectSlug(name, id) : project!.slug;
  const images = formData.getAll("images").map(String).filter(Boolean);

  await prisma.$transaction([
    prisma.projectImage.deleteMany({ where: { projectId: id } }),
    prisma.project.update({
      where: { id },
      data: {
        name,
        slug,
        description: String(formData.get("description") ?? "").trim(),
        status: String(formData.get("status") ?? "UPCOMING") as
          | "UPCOMING"
          | "UNDER_CONSTRUCTION"
          | "READY_TO_MOVE",
        city: String(formData.get("city") ?? "").trim(),
        locality: String(formData.get("locality") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        priceMin: formData.get("priceMin") ? Number(formData.get("priceMin")) : null,
        priceMax: formData.get("priceMax") ? Number(formData.get("priceMax")) : null,
        possessionDate: formData.get("possessionDate")
          ? new Date(String(formData.get("possessionDate")))
          : null,
        amenities: readAmenitiesFromForm(formData),
      reraNumber: String(formData.get("reraNumber") ?? "").trim() || null,
        metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
        metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
        images: { create: images.map((url, order) => ({ url, order })) },
      },
    }),
  ]);

  redirect(`/admin/developers/${developerId}/projects/${id}/edit?saved=1`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const developerId = String(formData.get("developerId") ?? "");
  await prisma.project.delete({ where: { id } });
  redirect(`/admin/developers/${developerId}/edit`);
}

export async function createCountry(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = await uniqueCountrySlug(name);
  await prisma.country.create({ data: { name, slug } });
  redirect("/admin/locations?saved=1");
}

export async function deleteCountry(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.country.delete({ where: { id } });
  redirect("/admin/locations");
}

export async function createState(formData: FormData) {
  await requireAdmin();
  const countryId = String(formData.get("countryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!countryId || !name) redirect("/admin/locations?error=state");

  const slug = await uniqueStateSlug(name, countryId);
  await prisma.state.create({ data: { name, slug, countryId } });
  redirect("/admin/locations?saved=1");
}

export async function deleteState(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.state.delete({ where: { id } });
  redirect("/admin/locations");
}

function readGeoPageFields(formData: FormData) {
  return {
    heroImage: String(formData.get("heroImage") ?? "").trim() || null,
    metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
    metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    published: formData.get("published") === "on",
  };
}

export async function createCity(formData: FormData) {
  await requireAdmin();
  const stateId = String(formData.get("stateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!stateId || !name) redirect("/admin/locations?error=city");

  const slug = await uniqueCitySlug(name);
  const state = await prisma.state.findUnique({ where: { id: stateId }, include: { country: true } });
  const coords = await geocodeLocation(
    [name, state?.name, state?.country.name].filter(Boolean).join(", ")
  );

  const city = await prisma.city.create({
    data: {
      name,
      slug,
      stateId,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      ...readGeoPageFields(formData),
    },
  });

  redirect(`/admin/locations/cities/${city.id}/edit?saved=1`);
}

export async function updateCity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const city = await prisma.city.findUnique({
    where: { id },
    include: { state: { include: { country: true } } },
  });
  if (!city) redirect("/admin/locations");

  const name = String(formData.get("name") ?? "").trim();
  const nameChanged = name !== city!.name;
  const slug = nameChanged ? await uniqueCitySlug(name, id) : city!.slug;
  const coords = nameChanged
    ? await geocodeLocation([name, city!.state.name, city!.state.country.name].join(", "))
    : { latitude: city!.latitude, longitude: city!.longitude };

  await prisma.city.update({
    where: { id },
    data: {
      name,
      slug,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      ...readGeoPageFields(formData),
    },
  });

  redirect(`/admin/locations/cities/${id}/edit?saved=1`);
}

export async function refetchCityCoordinates(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const city = await prisma.city.findUnique({
    where: { id },
    include: { state: { include: { country: true } } },
  });
  if (!city) redirect("/admin/locations");

  const coords = await geocodeLocation([city!.name, city!.state.name, city!.state.country.name].join(", "));
  await prisma.city.update({
    where: { id },
    data: { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
  });

  redirect(`/admin/locations/cities/${id}/edit?saved=1`);
}

export async function deleteCity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.city.delete({ where: { id } });
  redirect("/admin/locations");
}

export async function createLocality(formData: FormData) {
  await requireAdmin();
  const cityId = String(formData.get("cityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!cityId || !name) redirect("/admin/locations?error=locality");

  const slug = await uniqueLocalitySlug(name, cityId);
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { state: { include: { country: true } } },
  });
  const coords = await geocodeLocation(
    [name, city?.name, city?.state.name, city?.state.country.name].filter(Boolean).join(", ")
  );

  await prisma.locality.create({
    data: {
      name,
      slug,
      cityId,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      ...readGeoPageFields(formData),
    },
  });

  redirect(`/admin/locations/cities/${cityId}/edit?saved=1`);
}

export async function refetchLocalityCoordinates(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const locality = await prisma.locality.findUnique({
    where: { id },
    include: { city: { include: { state: { include: { country: true } } } } },
  });
  if (!locality) redirect("/admin/locations");

  const coords = await geocodeLocation(
    [locality!.name, locality!.city.name, locality!.city.state.name, locality!.city.state.country.name].join(", ")
  );
  await prisma.locality.update({
    where: { id },
    data: { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
  });

  redirect(`/admin/locations/localities/${id}/edit?saved=1`);
}

export async function updateLocality(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  const locality = await prisma.locality.findUnique({
    where: { id },
    include: { city: { include: { state: { include: { country: true } } } } },
  });
  if (!locality) redirect(`/admin/locations/cities/${cityId}/edit`);

  const name = String(formData.get("name") ?? "").trim();
  const nameChanged = name !== locality!.name;
  const coords = nameChanged
    ? await geocodeLocation(
        [name, locality!.city.name, locality!.city.state.name, locality!.city.state.country.name].join(", ")
      )
    : { latitude: locality!.latitude, longitude: locality!.longitude };
  const slug =
    name !== locality!.name ? await uniqueLocalitySlug(name, cityId, id) : locality!.slug;

  await prisma.locality.update({
    where: { id },
    data: {
      name,
      slug,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      ...readGeoPageFields(formData),
    },
  });

  redirect(`/admin/locations/cities/${cityId}/edit?saved=1`);
}

export async function deleteLocality(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  await prisma.locality.delete({ where: { id } });
  redirect(`/admin/locations/cities/${cityId}/edit`);
}

export async function approveProperty(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const property = await prisma.property.update({
    where: { id },
    data: { approvalStatus: "APPROVED" },
    include: { owner: { select: { phone: true, email: true } } },
  });
  await notifyUser(
    property.owner,
    `Your listing "${property.title}" has been approved and is now live on BayaEstate.`,
    "Listing approved"
  );
  redirect("/admin");
}

export async function rejectProperty(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.property.update({
    where: { id },
    data: { approvalStatus: "REJECTED" },
  });
  redirect("/admin");
}

async function uniqueAmenitySlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "amenity";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.amenity.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function createAmenity(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/amenities?error=name");

  const slug = await uniqueAmenitySlug(name);
  const count = await prisma.amenity.count();
  await prisma.amenity.create({ data: { name, slug, order: count } });
  redirect("/admin/amenities?saved=1");
}

export async function updateAmenity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/amenities?error=name");

  const amenity = await prisma.amenity.findUnique({ where: { id } });
  if (!amenity) redirect("/admin/amenities");

  const slug = name !== amenity!.name ? await uniqueAmenitySlug(name, id) : amenity!.slug;
  await prisma.amenity.update({ where: { id }, data: { name, slug } });
  redirect("/admin/amenities?saved=1");
}

export async function deleteAmenity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.amenity.delete({ where: { id } });
  redirect("/admin/amenities");
}

export async function verifyUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.update({ where: { id }, data: { verified: true } });
  await notifyUser(
    user,
    "Your BayaEstate profile is verified — it and your listings are now live on the public site.",
    "Profile verified"
  );
  redirect("/admin/users");
}

export async function unverifyUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.user.update({ where: { id }, data: { verified: false } });
  redirect("/admin/users");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function updateSiteSettings(formData: FormData) {
  await requireAdmin();

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      siteName: String(formData.get("siteName") ?? "").trim() || "BayaEstate",
      tagline: text(formData, "tagline"),
      logoUrl: text(formData, "logoUrl"),
      favicon: text(formData, "favicon"),
      heroImage: text(formData, "heroImage"),
      heroTitle: text(formData, "heroTitle"),
      heroSubtitle: text(formData, "heroSubtitle"),
      ctaText: text(formData, "ctaText"),
      ctaLink: text(formData, "ctaLink"),
      whatsappNumber: text(formData, "whatsappNumber"),
      contactEmail: text(formData, "contactEmail"),
      contactPhone: text(formData, "contactPhone"),
      contactAddress: text(formData, "contactAddress"),
      instagramUrl: text(formData, "instagramUrl"),
      facebookUrl: text(formData, "facebookUrl"),
      youtubeUrl: text(formData, "youtubeUrl"),
      linkedinUrl: text(formData, "linkedinUrl"),
      footerText: text(formData, "footerText"),
      metaTitle: text(formData, "metaTitle"),
      metaDescription: text(formData, "metaDescription"),
      ogImage: text(formData, "ogImage"),
      googleAnalyticsId: text(formData, "googleAnalyticsId"),
      googleSiteVerification: text(formData, "googleSiteVerification"),
    },
    create: {
      id: "singleton",
      siteName: String(formData.get("siteName") ?? "").trim() || "BayaEstate",
      tagline: text(formData, "tagline"),
      logoUrl: text(formData, "logoUrl"),
      favicon: text(formData, "favicon"),
      heroImage: text(formData, "heroImage"),
      heroTitle: text(formData, "heroTitle"),
      heroSubtitle: text(formData, "heroSubtitle"),
      ctaText: text(formData, "ctaText"),
      ctaLink: text(formData, "ctaLink"),
      whatsappNumber: text(formData, "whatsappNumber"),
      contactEmail: text(formData, "contactEmail"),
      contactPhone: text(formData, "contactPhone"),
      contactAddress: text(formData, "contactAddress"),
      instagramUrl: text(formData, "instagramUrl"),
      facebookUrl: text(formData, "facebookUrl"),
      youtubeUrl: text(formData, "youtubeUrl"),
      linkedinUrl: text(formData, "linkedinUrl"),
      footerText: text(formData, "footerText"),
      metaTitle: text(formData, "metaTitle"),
      metaDescription: text(formData, "metaDescription"),
      ogImage: text(formData, "ogImage"),
      googleAnalyticsId: text(formData, "googleAnalyticsId"),
      googleSiteVerification: text(formData, "googleSiteVerification"),
    },
  });

  redirect("/admin/settings?saved=1");
}

export async function createPlan(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const listingLimit = Number(formData.get("listingLimit") ?? 0);
  if (!name || listingLimit <= 0) redirect("/admin/plans?error=1");

  await prisma.plan.create({
    data: {
      name,
      role: String(formData.get("role") ?? "BOTH") as "OWNER" | "DEALER" | "BOTH",
      listingLimit,
      leadLimit: formData.get("leadLimit") ? Number(formData.get("leadLimit")) : null,
      price: Number(formData.get("price") ?? 0),
      durationDays: formData.get("durationDays") ? Number(formData.get("durationDays")) : null,
    },
  });

  redirect("/admin/plans?saved=1");
}

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const name = String(formData.get("name") ?? "").trim();
  const listingLimit = Number(formData.get("listingLimit") ?? 0);
  if (!name || listingLimit <= 0) redirect("/admin/plans?error=1");

  await prisma.plan.update({
    where: { id },
    data: {
      name,
      role: String(formData.get("role") ?? "BOTH") as "OWNER" | "DEALER" | "BOTH",
      listingLimit,
      leadLimit: formData.get("leadLimit") ? Number(formData.get("leadLimit")) : null,
      price: Number(formData.get("price") ?? 0),
      durationDays: formData.get("durationDays") ? Number(formData.get("durationDays")) : null,
      active: formData.get("active") === "on",
    },
  });

  redirect("/admin/plans?saved=1");
}

export async function deletePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.plan.delete({ where: { id } });
  redirect("/admin/plans");
}

export async function assignSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!userId || !planId) redirect("/admin/users");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) redirect("/admin/users");

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
    prisma.subscription.create({
      data: {
        userId,
        planId,
        status: "ACTIVE",
        amount: plan!.price,
        endDate: plan!.durationDays
          ? new Date(Date.now() + plan!.durationDays * 24 * 60 * 60 * 1000)
          : null,
      },
    }),
  ]);

  redirect("/admin/users?saved=1");
}

export async function cancelSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  redirect("/admin/users?saved=1");
}

export async function approveSubscriptionRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: { plan: true, user: { select: { phone: true, email: true } } },
  });
  if (!subscription || subscription.status !== "PENDING") redirect("/admin/users");

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: subscription.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
    prisma.subscription.update({
      where: { id },
      data: {
        status: "ACTIVE",
        startDate: new Date(),
        endDate: subscription.plan.durationDays
          ? new Date(Date.now() + subscription.plan.durationDays * 24 * 60 * 60 * 1000)
          : null,
      },
    }),
  ]);

  await notifyUser(
    subscription.user,
    `Your ${subscription.plan.name} plan is now active on BayaEstate.`,
    "Plan activated"
  );

  redirect("/admin/users?saved=1");
}

export async function rejectSubscriptionRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.subscription.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  redirect("/admin/users?saved=1");
}

export async function toggleCityPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const city = await prisma.city.findUnique({ where: { id }, select: { published: true } });
  if (!city) redirect("/admin/sitemap");
  await prisma.city.update({ where: { id }, data: { published: !city.published } });
  redirect("/admin/sitemap");
}

export async function toggleLocalityPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const locality = await prisma.locality.findUnique({ where: { id }, select: { published: true } });
  if (!locality) redirect("/admin/sitemap");
  await prisma.locality.update({ where: { id }, data: { published: !locality.published } });
  redirect("/admin/sitemap");
}

export async function createSubAdmin(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    redirect("/admin/subadmins?error=validation");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/subadmins?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "SUBADMIN",
      verified: true,
    },
  });

  redirect("/admin/subadmins?saved=1");
}

export async function deleteSubAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const subAdmin = await prisma.user.findUnique({
    where: { id },
    select: { role: true, _count: { select: { properties: true } } },
  });
  if (!subAdmin || subAdmin.role !== "SUBADMIN") redirect("/admin/subadmins");
  if (subAdmin._count.properties > 0) {
    redirect("/admin/subadmins?error=hasListings");
  }

  await prisma.user.delete({ where: { id } });
  redirect("/admin/subadmins");
}
