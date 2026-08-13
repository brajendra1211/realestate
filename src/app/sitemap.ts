import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, dealers, owners, developers, projects, cities] = await Promise.all([
    prisma.property.findMany({
      where: { approvalStatus: "APPROVED", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
      select: { slug: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { role: "DEALER", slug: { not: null }, verified: true },
      select: { slug: true },
    }),
    prisma.user.findMany({
      where: { role: "OWNER", slug: { not: null }, verified: true },
      select: { slug: true },
    }),
    prisma.developer.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.project.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.city.findMany({
      where: { published: true },
      select: {
        slug: true,
        name: true,
        updatedAt: true,
        localities: { where: { published: true }, select: { slug: true, name: true, updatedAt: true } },
      },
    }),
  ]);

  // Only index location pages that actually have live listings, to avoid thin/duplicate content.
  const locationRoutes: MetadataRoute.Sitemap = [];
  for (const city of cities) {
    const cityCount = await prisma.property.count({
      where: {
        approvalStatus: "APPROVED",
        status: "AVAILABLE",
        city: { contains: city.name },
        owner: PUBLIC_LISTER_FILTER,
        ...notExpiredFilter(),
      },
    });
    if (cityCount > 0) {
      locationRoutes.push({
        url: `${SITE_URL}/properties-in/${city.slug}`,
        lastModified: city.updatedAt,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    for (const locality of city.localities) {
      const localityCount = await prisma.property.count({
        where: {
          approvalStatus: "APPROVED",
          status: "AVAILABLE",
          city: { contains: city.name },
          locality: { contains: locality.name },
          owner: PUBLIC_LISTER_FILTER,
          ...notExpiredFilter(),
        },
      });
      if (localityCount > 0) {
        locationRoutes.push({
          url: `${SITE_URL}/properties-in/${city.slug}/${locality.slug}`,
          lastModified: locality.updatedAt,
          changeFrequency: "daily",
          priority: 0.85,
        });
      }
    }
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/properties`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/dealers`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/owners`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/developers`, changeFrequency: "daily", priority: 0.7 },
  ];

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${SITE_URL}/properties/${property.slug}`,
    lastModified: property.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const dealerRoutes: MetadataRoute.Sitemap = dealers
    .filter((dealer) => dealer.slug)
    .map((dealer) => ({
      url: `${SITE_URL}/dealers/${dealer.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  const ownerRoutes: MetadataRoute.Sitemap = owners
    .filter((owner) => owner.slug)
    .map((owner) => ({
      url: `${SITE_URL}/owners/${owner.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  const developerRoutes: MetadataRoute.Sitemap = developers.map((developer) => ({
    url: `${SITE_URL}/developers/${developer.slug}`,
    lastModified: developer.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...propertyRoutes,
    ...dealerRoutes,
    ...ownerRoutes,
    ...developerRoutes,
    ...projectRoutes,
    ...locationRoutes,
  ];
}
