import { prisma } from "@/lib/prisma";

export type ListingBrief = {
  title: string;
  locality: string | null;
  city: string | null;
  price: number;
  listingType: string;
  propertyType: string;
  bedrooms: number | null;
  /** Whose listing this is, from the viewing partner's side. */
  listedBy: "YOURS" | "PARTNER" | "ADMIN";
  listedByLabel: string;
};

/** What a partner needs to see when a buyer rings or a buzz arrives: which property, where, and whose listing it is. */
export async function listingBriefFor(agentListingId: string, viewerAgentId: string | null): Promise<ListingBrief | null> {
  const l = await prisma.agentListing.findUnique({
    where: { id: agentListingId },
    select: {
      title: true,
      price: true,
      listingType: true,
      propertyType: true,
      bedrooms: true,
      agentId: true,
      masterProperty: { select: { city: true, locality: true } },
      agent: { select: { agentCode: true, shopName: true, user: { select: { name: true } } } },
    },
  });
  if (!l) return null;
  let listedBy: ListingBrief["listedBy"];
  let listedByLabel: string;
  if (!l.agentId) {
    listedBy = "ADMIN";
    listedByLabel = "Company (admin) listing";
  } else if (l.agentId === viewerAgentId) {
    listedBy = "YOURS";
    listedByLabel = "Your own listing";
  } else {
    listedBy = "PARTNER";
    const who = l.agent?.shopName || l.agent?.user.name || l.agent?.agentCode || "another partner";
    listedByLabel = `Listed by channel partner ${who}`;
  }
  return {
    title: l.title,
    locality: l.masterProperty?.locality ?? null,
    city: l.masterProperty?.city ?? null,
    price: l.price,
    listingType: l.listingType,
    propertyType: l.propertyType,
    bedrooms: l.bedrooms ?? null,
    listedBy,
    listedByLabel,
  };
}

export const briefWhere = (b: Pick<ListingBrief, "locality" | "city">) => [b.locality, b.city].filter(Boolean).join(", ");
