import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  siteName: "BayaEstate",
  tagline: "Find your next home, fast.",
  logoUrl: null as string | null,
  favicon: null as string | null,
  heroImage: null as string | null,
  heroTitle: "Find the right property, faster",
  heroSubtitle:
    "Buy, sell, and rent homes with verified agents across the city.",
  ctaText: "List a property",
  ctaLink: "/register",
  whatsappNumber: null as string | null,
  contactEmail: null as string | null,
  contactPhone: null as string | null,
  contactAddress: null as string | null,
  instagramUrl: null as string | null,
  facebookUrl: null as string | null,
  youtubeUrl: null as string | null,
  linkedinUrl: null as string | null,
  footerText: null as string | null,
  metaTitle: null as string | null,
  metaDescription: null as string | null,
  ogImage: null as string | null,
  googleAnalyticsId: null as string | null,
  googleSiteVerification: null as string | null,
};

export async function getSiteSettings() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  return settings ?? DEFAULT_SETTINGS;
}
