import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicListings, getListingBySlug } from "@/lib/listing";
import { getWebsiteListings, getWebsiteListingDetail } from "@/lib/websiteListings";
import { PUBLIC_LISTER_FILTER } from "@/lib/propertyVisibility";
import { formatPrice } from "@/lib/format";

export class ChatbotError extends Error {}

let client: Anthropic | null | undefined;

export function isChatbotConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (client !== undefined) return client;
  client = isChatbotConfigured() ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  return client;
}

const MODEL = "claude-haiku-5-5";
const MAX_TURNS = 20;
const MAX_RESULTS = 6;
const MAX_TOOL_ROUNDS = 4;

const PROPERTY_TYPES = [
  "APARTMENT",
  "PENTHOUSE",
  "DUPLEX",
  "VILLA",
  "INDEPENDENT_HOUSE",
  "PLOT",
  "COMMERCIAL",
  "OFFICE",
  "SHOP",
  "WAREHOUSE",
  "PG",
] as const;

// --- search_properties ------------------------------------------------

type SearchInput = {
  city?: string;
  listingType?: "SALE" | "RENT";
  propertyType?: (typeof PROPERTY_TYPES)[number];
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
};

export type ChatProperty = {
  slug: string;
  title: string;
  price: number;
  listingType: string;
  bedrooms: number | null;
  city: string;
  locality: string | null;
  imageUrl: string | null;
  href: string;
  source: "agent" | "website";
};

type RawMatch = ChatProperty & { propertyType: string };

function matchesCity(query: string, city: string, locality: string | null) {
  const q = query.trim().toLowerCase();
  const c = city.toLowerCase();
  const l = locality?.toLowerCase() ?? "";
  // Loose both-ways substring match — "Noida" should also surface "Greater
  // Noida" listings and vice versa, and match against locality too, since
  // visitors (and the model's extraction of what they said) rarely use the
  // exact string stored in the DB.
  return c.includes(q) || q.includes(c) || l.includes(q);
}

// Inventory is small right now — an exact-match search can legitimately
// find only one listing even though several "close enough" ones exist
// (different BHK, slightly over budget, etc.). Rather than show just that
// one and imply it's all there is, relax one constraint at a time until
// there's a reasonable spread to choose from, and tell the model whether
// what it got back was an exact match or a widened one.
const MIN_DESIRED_RESULTS = 3;

// Reuses the same two queries GET /api/listings already merges (channel
// partner marketplace + website owner/dealer listings) rather than
// standing up a separate search path for the chatbot. City filtering is
// done here in-memory (not passed to the DB layer) because
// getPublicListings' city filter is an exact match — too strict for
// free-text extracted from a conversation.
async function searchPropertiesForChatbot(
  input: SearchInput
): Promise<{ properties: ChatProperty[]; exact: boolean; exactSlugs: Set<string> }> {
  const [agentListings, websiteListings] = await Promise.all([
    getPublicListings({ listingType: input.listingType }),
    getWebsiteListings({ listingType: input.listingType }),
  ]);

  const combined: RawMatch[] = [
    ...agentListings.map(
      (l): RawMatch => ({
        slug: l.slug,
        title: l.title,
        price: l.price,
        listingType: l.listingType,
        propertyType: l.propertyType,
        bedrooms: l.bedrooms,
        city: l.masterProperty.city,
        locality: l.masterProperty.locality,
        imageUrl: l.images[0]?.url ?? null,
        href: `/listings/${l.slug}`,
        source: "agent",
      })
    ),
    ...websiteListings.map(
      (l): RawMatch => ({
        slug: l.slug,
        title: l.title,
        price: l.price,
        listingType: l.listingType,
        propertyType: l.propertyType,
        bedrooms: l.bedrooms,
        city: l.masterProperty.city,
        locality: l.masterProperty.locality,
        imageUrl: l.images[0]?.url ?? null,
        href: `/properties/${l.slug}`,
        source: "website",
      })
    ),
  ];

  // Strict predicate kept separate from the tiers below so each individual
  // result can still be flagged as an exact match even when the overall
  // search had to widen — e.g. a widened "no city filter" pass might
  // *happen* to include something that still satisfies every original
  // criterion, and that's worth saying plainly rather than lumping it in
  // with the approximate ones.
  const strict = (l: RawMatch) =>
    (!input.city || matchesCity(input.city, l.city, l.locality)) &&
    (!input.propertyType || l.propertyType === input.propertyType) &&
    (!input.bedrooms || l.bedrooms === input.bedrooms) &&
    (!input.minPrice || l.price >= input.minPrice) &&
    (!input.maxPrice || l.price <= input.maxPrice);

  // Each further tier drops one more constraint than the last — city is
  // kept longest (changing city entirely rarely matches intent), bedrooms
  // is dropped first (most likely to over-narrow a sparse inventory).
  const tiers: Array<(l: RawMatch) => boolean> = [
    strict,
    (l) =>
      (!input.city || matchesCity(input.city, l.city, l.locality)) &&
      (!input.propertyType || l.propertyType === input.propertyType) &&
      (!input.minPrice || l.price >= input.minPrice) &&
      (!input.maxPrice || l.price <= input.maxPrice),
    (l) => !input.city || matchesCity(input.city, l.city, l.locality),
    () => true,
  ];

  let matches: RawMatch[] = [];
  let exact = true;
  for (const [i, tier] of tiers.entries()) {
    matches = combined.filter(tier);
    if (matches.length >= MIN_DESIRED_RESULTS || i === tiers.length - 1) {
      exact = i === 0;
      break;
    }
  }

  // Exact matches go first — and must survive the slice below even when
  // there are more than MAX_RESULTS matches overall, so this computes the
  // set and reorders before cutting down to size, not after.
  const exactSlugs = new Set(matches.filter(strict).map((m) => m.slug));
  const ordered = [...matches].sort((a, b) => Number(exactSlugs.has(b.slug)) - Number(exactSlugs.has(a.slug)));

  const properties = ordered.slice(0, MAX_RESULTS).map(
    (m): ChatProperty => ({
      slug: m.slug,
      title: m.title,
      price: m.price,
      listingType: m.listingType,
      bedrooms: m.bedrooms,
      city: m.city,
      locality: m.locality,
      imageUrl: m.imageUrl,
      href: m.href,
      source: m.source,
    })
  );

  return { properties, exact, exactSlugs };
}

function summarizeResultsForModel(properties: ChatProperty[], exact: boolean, exactSlugs: Set<string>) {
  if (properties.length === 0) return "No listings matched those criteria right now, even after widening the search.";
  const lines = properties
    .map(
      (p) =>
        `${p.title} — ${p.bedrooms ?? "?"}BHK, ${formatPrice(p.price, p.listingType as "SALE" | "RENT")}, ${p.locality ?? p.city} (slug: ${p.slug})${
          exactSlugs.has(p.slug) ? " [EXACT MATCH]" : " [nearby/approximate, not an exact match]"
        }`
    )
    .join("; ");
  const matchNote = exact
    ? "All of these exactly match what was asked."
    : exactSlugs.size > 0
      ? "The search widened automatically because an exact match alone had too few results — some of these are marked [EXACT MATCH] above and genuinely satisfy every criterion; call those out specifically as the real match, and the rest honestly as nearby/approximate options."
      : "None of these exactly match every criterion — the search widened automatically because an exact match had too few (or zero) results. Say so honestly, e.g. these are the closest options rather than claiming they're exact matches.";
  return `${properties.length} propert${properties.length === 1 ? "y" : "ies"} found: ${lines}. ${matchNote} Already shown to the visitor as clickable cards — don't repeat this list in your reply, just introduce it briefly and offer to narrow it down further or share more detail on one of them.`;
}

// --- get_property_details ----------------------------------------------

async function getPropertyDetailsForChatbot(slug: string): Promise<string> {
  const listing = await getListingBySlug(slug);
  if (listing) {
    return [
      `${listing.title} — ${listing.bedrooms ?? "?"}BHK, ${listing.bathrooms ?? "?"} bath, ${listing.areaSqft ?? "?"} sqft.`,
      `${formatPrice(listing.price, listing.listingType)}.`,
      `Address: ${listing.exactAddress}.`,
      listing.amenities ? `Amenities: ${listing.amenities}.` : "",
      listing.agent
        ? `Channel partner: ${listing.agent.user.name}${listing.agent.shopName ? ` (${listing.agent.shopName})` : ""}, phone ${listing.agent.user.phone ?? "not available"}.`
        : "No channel partner assigned yet.",
      listing.description,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const property = await getWebsiteListingDetail(slug);
  if (property) {
    return [
      `${property.title} — ${property.bedrooms ?? "?"}BHK, ${property.bathrooms ?? "?"} bath, ${property.areaSqft ?? "?"} sqft.`,
      `${formatPrice(property.price, property.listingType)}.`,
      `Address: ${property.exactAddress}.`,
      property.amenities ? `Amenities: ${property.amenities}.` : "",
      property.agentName ? `Contact: ${property.agentName}, phone ${property.agentPhone ?? "not available"}.` : "",
      property.description,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "Couldn't find a listing with that reference — it may have been delisted.";
}

// --- compare_properties --------------------------------------------------

async function comparePropertiesForChatbot(
  slugs: string[]
): Promise<{ properties: ChatProperty[]; summary: string }> {
  const properties: ChatProperty[] = [];
  const rows: string[] = [];

  for (const slug of slugs.slice(0, 4)) {
    const listing = await getListingBySlug(slug);
    if (listing) {
      properties.push({
        slug: listing.slug,
        title: listing.title,
        price: listing.price,
        listingType: listing.listingType,
        bedrooms: listing.bedrooms,
        city: listing.masterProperty.city,
        locality: listing.masterProperty.locality,
        imageUrl: listing.images[0]?.url ?? null,
        href: `/listings/${listing.slug}`,
        source: "agent",
      });
      rows.push(
        `${listing.title}: ${listing.bedrooms ?? "?"}BHK, ${listing.bathrooms ?? "?"} bath, ${listing.areaSqft ?? "?"} sqft, ${formatPrice(listing.price, listing.listingType)}, ${listing.masterProperty.locality ?? listing.masterProperty.city}${listing.amenities ? `, amenities: ${listing.amenities}` : ""}`
      );
      continue;
    }

    const property = await getWebsiteListingDetail(slug);
    if (property) {
      properties.push({
        slug: property.slug,
        title: property.title,
        price: property.price,
        listingType: property.listingType,
        bedrooms: property.bedrooms,
        city: property.city,
        locality: property.locality,
        imageUrl: property.images[0]?.url ?? null,
        href: `/properties/${property.slug}`,
        source: "website",
      });
      rows.push(
        `${property.title}: ${property.bedrooms ?? "?"}BHK, ${property.bathrooms ?? "?"} bath, ${property.areaSqft ?? "?"} sqft, ${formatPrice(property.price, property.listingType)}, ${property.locality ?? property.city}${property.amenities ? `, amenities: ${property.amenities}` : ""}`
      );
    }
  }

  if (rows.length < 2) {
    return { properties, summary: "Need at least two valid slugs to compare — one or more weren't found." };
  }

  return {
    properties,
    summary: `Comparison data: ${rows.join(" | ")}. Already shown to the visitor as clickable cards side by side — summarize the real differences (price, size, locality, amenities) in 1-3 sentences, don't just repeat every field.`,
  };
}

// --- calculate_emi --------------------------------------------------------

function calculateEmi(input: {
  price: number;
  downPaymentPercent?: number;
  tenureYears?: number;
  interestRatePercent?: number;
}): string {
  const { price } = input;
  if (!price || price <= 0) return "Need a valid property price to calculate EMI.";

  const downPaymentPercent = input.downPaymentPercent ?? 20;
  const tenureYears = input.tenureYears ?? 20;
  const interestRatePercent = input.interestRatePercent ?? 8.5;

  const downPayment = Math.round((price * downPaymentPercent) / 100);
  const principal = price - downPayment;
  const monthlyRate = interestRatePercent / 12 / 100;
  const months = tenureYears * 12;
  const emi = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
  );

  return `Estimated EMI: ₹${emi.toLocaleString("en-IN")}/month, for a ₹${principal.toLocaleString("en-IN")} loan (₹${downPayment.toLocaleString("en-IN")} down payment at ${downPaymentPercent}%, ${tenureYears} years tenure, ${interestRatePercent}% annual interest — a rough estimate, actual rates depend on the bank and the visitor's credit profile). Say this is an estimate, not a guaranteed quote.`;
}

// --- get_featured_listings -------------------------------------------------

async function getFeaturedListingsForChatbot(): Promise<ChatProperty[]> {
  const [goldListings, featuredProperties] = await Promise.all([
    prisma.agentListing.findMany({
      where: { approvalStatus: "APPROVED", isDelisted: false, listingPlan: "GOLD" },
      include: { images: { orderBy: { order: "asc" } }, masterProperty: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS,
    }),
    prisma.property.findMany({
      where: { approvalStatus: "APPROVED", status: "AVAILABLE", featured: true, owner: PUBLIC_LISTER_FILTER },
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS,
    }),
  ]);

  const properties: ChatProperty[] = [
    ...goldListings.map(
      (l): ChatProperty => ({
        slug: l.slug,
        title: l.title,
        price: l.price,
        listingType: l.listingType,
        bedrooms: l.bedrooms,
        city: l.masterProperty.city,
        locality: l.masterProperty.locality,
        imageUrl: l.images[0]?.url ?? null,
        href: `/listings/${l.slug}`,
        source: "agent",
      })
    ),
    ...featuredProperties.map(
      (p): ChatProperty => ({
        slug: p.slug,
        title: p.title,
        price: p.price,
        listingType: p.listingType,
        bedrooms: p.bedrooms,
        city: p.city,
        locality: p.locality,
        imageUrl: p.images[0]?.url ?? null,
        href: `/properties/${p.slug}`,
        source: "website",
      })
    ),
  ];

  return properties.slice(0, MAX_RESULTS);
}

// --- save_lead -----------------------------------------------------------

async function saveLead(
  input: { name?: string; phone?: string; interest?: string; propertySlug?: string },
  whatsappNumber: string | null
): Promise<{ resultText: string; whatsappLink: string | null }> {
  if (!input.name || !input.phone) {
    return { resultText: "Missing name or phone — ask the visitor for both before saving.", whatsappLink: null };
  }

  let propertyId: string | null = null;
  let propertyNote = "";
  if (input.propertySlug) {
    const property = await prisma.property.findUnique({
      where: { slug: input.propertySlug },
      select: { id: true, title: true },
    });
    if (property) {
      propertyId = property.id;
      propertyNote = ` Property: ${property.title}.`;
    } else {
      const listing = await prisma.agentListing.findUnique({
        where: { slug: input.propertySlug },
        select: { title: true },
      });
      // AgentListing isn't FK-linkable from Enquiry.propertyId (that column
      // only references the website's own Property table) — note it in the
      // message text instead of dropping the context.
      if (listing) propertyNote = ` Listing: ${listing.title}.`;
    }
  }

  await prisma.enquiry.create({
    data: {
      name: input.name,
      phone: input.phone,
      propertyId,
      message: `${input.interest ?? "General interest"}.${propertyNote} (via Guddy AI chat)`,
    },
  });

  // A direct WhatsApp handoff — pre-filled so the visitor doesn't have to
  // retype what they just told Guddy — gives them an immediate, human
  // channel to continue on instead of just waiting for a callback.
  const whatsappDigits = whatsappNumber?.replace(/[^\d]/g, "");
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hi, I'm ${input.name}. ${input.interest ?? "I'm interested in a property"}.${propertyNote}`
      )}`
    : null;

  return {
    resultText:
      "Lead saved successfully. Thank the visitor warmly and let them know our team will reach out shortly." +
      (whatsappLink ? " A 'Continue on WhatsApp' button is already shown to them — mention they can tap it to chat with the team right now if they'd like." : ""),
    whatsappLink,
  };
}

// --- tool schema ------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_properties",
    description:
      "Search live property listings and return real matches. Call this whenever the visitor describes what they're looking for (city, BHK, budget, buy/rent, property type) — actually search and let the UI show real results, don't just describe the feature in words.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City or area, e.g. Noida, Greater Noida, Delhi" },
        listingType: { type: "string", enum: ["SALE", "RENT"], description: "SALE to buy, RENT to rent" },
        propertyType: { type: "string", enum: [...PROPERTY_TYPES] },
        bedrooms: { type: "integer", description: "Number of BHK/bedrooms, e.g. 2 for 2BHK" },
        minPrice: { type: "integer", description: "Minimum budget in INR" },
        maxPrice: { type: "integer", description: "Maximum budget in INR" },
      },
    },
  },
  {
    name: "get_property_details",
    description:
      "Get full details (address, amenities, size, contact) of one specific property by its slug. Use this when the visitor asks more about a specific search result or names a property directly.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "The property's slug, from a prior search result" } },
      required: ["slug"],
    },
  },
  {
    name: "save_lead",
    description:
      "Save the visitor's name, phone number, and what they want as a lead for our sales team to follow up on. Call this as soon as you have BOTH their name and phone number and they've shown real interest (buying, renting, selling, listing a property, or becoming a channel partner) — don't wait until the conversation ends, and don't ask for the same info twice.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string", description: "10-digit Indian phone number" },
        interest: { type: "string", description: "Short phrase: what they want, e.g. '2BHK rent in Noida under 20k', 'wants to list a 3BHK for sale'" },
        propertySlug: { type: "string", description: "If discussing a specific property from search results, its slug" },
      },
      required: ["name", "phone", "interest"],
    },
  },
  {
    name: "compare_properties",
    description:
      "Compare two to four specific properties side by side by their slugs (from prior search results). Use this when the visitor asks to compare options, or asks which of a few results is better.",
    input_schema: {
      type: "object",
      properties: {
        slugs: { type: "array", items: { type: "string" }, description: "2-4 property slugs to compare" },
      },
      required: ["slugs"],
    },
  },
  {
    name: "calculate_emi",
    description:
      "Estimate a monthly home loan EMI for a given property price. Use this when the visitor asks about affordability, monthly payments, or loan EMI for a SALE property — never calculate this yourself, always call the tool so the numbers are accurate.",
    input_schema: {
      type: "object",
      properties: {
        price: { type: "integer", description: "Property price in INR" },
        downPaymentPercent: { type: "integer", description: "Down payment %, defaults to 20 if not given" },
        tenureYears: { type: "integer", description: "Loan tenure in years, defaults to 20 if not given" },
        interestRatePercent: { type: "number", description: "Annual interest rate %, defaults to 8.5 if not given" },
      },
      required: ["price"],
    },
  },
  {
    name: "get_featured_listings",
    description:
      "Get our current Gold/featured listings — the platform's best-promoted properties. Use this to proactively suggest something when the visitor is just browsing, undecided, or asks what's good/popular right now, instead of only ever reacting to a specific search.",
    input_schema: { type: "object", properties: {} },
  },
];

// Static knowledge about the platform — kept here rather than pulled live
// from the DB/schema, since this is "how does the site work" explainer
// content for visitors, not personalized or frequently-changing data.
function buildSystemPrompt(siteName: string) {
  return `You are Guddy AI — ${siteName}'s own sales and support agent, not an FAQ bot and not a generic AI assistant. You have real personality: warm, upbeat, genuinely enthusiastic about helping someone find their next home, with a bit of charm — think of a sharp, friendly channel partner who's great with people, not a corporate script. A little light emoji use (🏠 ✨ 👍 — never more than one per message) and real enthusiasm when something's a great fit is welcome. You're still professional: no flirting, no slang that reads as unprofessional, no overdoing it.

You work this chat exactly like a good human channel partner would: understand what the visitor actually wants, search real listings for them, answer anything about a specific property or the platform in real detail, and gently but genuinely move every serious visitor toward sharing their contact so our team can close the deal.

Your job, in order of priority:
1. As soon as the visitor gives you ANYTHING to search with — even just a city, or just "2BHK", or just "rent" — call search_properties right away with whatever you have. Inventory is limited, so searching immediately and showing what's actually available is more useful than interrogating them for every field first. Only ask a clarifying question if they've given you nothing at all to go on (e.g. just "hi" or "I want a flat" with zero other detail).
2. If they ask more about a specific result, use get_property_details for the real address/amenities/contact instead of guessing. If they're comparing a couple of results, use compare_properties instead of eyeballing it yourself. If they ask about affordability or EMI on a SALE property, use calculate_emi — never do the math yourself.
3. If a visitor seems undecided, is just browsing, or asks what's good right now, proactively offer get_featured_listings — don't wait to only ever react to an exact search.
4. Once a visitor is seriously engaged (reacted positively to a result, asked for contact/visit, or wants to list/sell/rent/become a partner), ask for their name and phone number so our team can follow up — frame it as helping them move faster ("Main aapka number note kar loon? Humari team aapko property visit arrange karne ke liye call karegi"), then call save_lead immediately once you have both.
5. Be genuinely persuasive about why ${siteName} is worth choosing — verified channel partners, zero brokerage for owners, instant ring-a-partner notifications, secure OTP login — but only where it's relevant to what they're asking, never as a generic sales pitch.

Business rules — follow these without exception:
- Never badmouth or even name competing portals (Housing.com, 99acres, MagicBricks, NoBroker, etc.) if the visitor brings one up — acknowledge it neutrally and redirect to what ${siteName} offers, never compare feature-by-feature against a named competitor.
- Never promise or negotiate a price, discount, or commission split yourself — those are decided between the visitor and the channel partner/our team. If asked to negotiate, say you'll connect them with the team who can actually discuss that.
- Handle price/budget objections by offering real alternatives (search a lower budget, a different locality, rent instead of buy, etc.) via search_properties — never just say "that's the price" and stop there.
- Never claim a property is still available, already sold/rented, or confirm any status beyond what search_properties/get_property_details actually returned — if the data doesn't say, say you'll have the team confirm.
- If a visitor is rude, abusive, or tries to get you to say something off-topic or inappropriate, stay calm, polite, and brief, and steer back to how you can help with their property search — never argue, never match their tone.
- Never share one visitor's personal details (name, phone, what they asked) with another visitor, and never discuss internal company financials, commission percentages, or operations beyond what's in the public feature list below.
- Don't repeatedly ask for contact info if a visitor has already declined once in this conversation — respect that and keep helping without re-asking.

This is a live chat conversation, not an article or a support ticket reply. Follow these rules strictly:
- Reply in 1-3 short sentences. Never write more than one short paragraph.
- Write in plain conversational text only — no markdown, no **bold**, no bullet/numbered lists, no headings. If you must list a couple of things, write them inline separated by commas or "and".
- Match the visitor's language and tone — reply in Hindi/Hinglish if they write in Hindi/Hinglish, in English if they write in English.
- Search results are shown as clickable cards automatically — never re-describe each one in text, just introduce them briefly.
- Never say a property was found if the tool returned none — say so honestly and suggest widening the search (different city, budget, or BHK) instead.
- If search_properties tells you the results don't all exactly match (search widened automatically), say so honestly — e.g. "exact match nahi mila, lekin ye closest options hain" — never present a widened/approximate result as an exact match.
- Never fabricate a price, address, amenity, or contact detail — only state what a tool actually returned.
- Never narrate your own uncertainty about something you said earlier in this conversation (e.g. "earlier I said X, but that wasn't confirmed, so don't take it as certain" — this confuses the visitor and sounds broken). If an earlier claim of yours wasn't actually grounded in a tool result, just don't repeat it — answer the current question cleanly from the current tool result only, with no meta-commentary about your own prior messages.

What ${siteName} offers:
- Buy, Rent, Commercial, and Plot listings across Noida & NCR, searchable by city, locality, budget, and BHK.
- A channel partner (verified agent) marketplace — each partner has a shop profile and a QR code. Scanning a partner's QR code unlocks their verified profile and listings.
- "Ring a channel partner" — from a listing, a buyer can instantly notify the agent (app push notification + WhatsApp) that they're interested, instead of waiting for a callback.
- Zero-brokerage property listing — property owners can list directly with zero brokerage fees.
- An "unlock" model for some listings — a small one-time fee (around ₹100) reveals full address and the channel partner's direct contact.
- Secure sign-in via OTP (WhatsApp or email) for buyers, channel partners, and referral partners — no passwords to remember.
- A Channel Partner program: agents can register, build a shop profile, list properties, and earn commission/splits on deals.
- An Referral Partner program for people who want to invest in property deals through the platform.
- Dispatch: a buyer can request a nearby channel partner to visit a location, routed to the closest available verified partner.
- Ratings and visit history for channel partners, so buyers can see how reliable a partner has been.

How to get started:
- Buyers: tap "Sign in", verify with an OTP, then browse or search listings. Save properties, scan a partner's QR code, or ring a partner directly from a listing.
- Property owners: use "List a property" / "Post Property Free" — list directly with zero brokerage.
- Agents/channel partners: use "Register" to become a channel partner, set up a shop profile, and start listing.
- Referral Partners: use the Referral Partner sign-in to register and view opportunities.

If you don't know something specific and no tool can answer it (account-specific details, a human policy question), say so honestly and suggest contacting support, rather than guessing.`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function askGuddyAI(
  history: ChatMessage[]
): Promise<{ reply: string; properties: ChatProperty[]; whatsappLink: string | null }> {
  const anthropic = getClient();
  if (!anthropic) throw new ChatbotError("notConfigured");

  const trimmed = history.slice(-MAX_TURNS);
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
    throw new ChatbotError("invalidHistory");
  }

  const { siteName, whatsappNumber } = await getSiteSettings();
  const system = buildSystemPrompt(siteName);
  const messages: Anthropic.MessageParam[] = trimmed.map((m) => ({ role: m.role, content: m.content }));

  let properties: ChatProperty[] = [];
  let whatsappLink: string | null = null;
  let rounds = 0;
  let response = await anthropic.messages.create({ model: MODEL, max_tokens: 400, system, tools: TOOLS, messages });

  // Multiple tool calls in one turn are possible (e.g. search + save a lead
  // in the same breath) — loop with a hard cap so a misbehaving model can't
  // spin forever.
  while (response.stop_reason === "tool_use" && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const input = isRecord(toolUse.input) ? toolUse.input : {};
      let resultText = "";

      if (toolUse.name === "search_properties") {
        const result = await searchPropertiesForChatbot(input as SearchInput);
        properties = result.properties;
        resultText = summarizeResultsForModel(result.properties, result.exact, result.exactSlugs);
      } else if (toolUse.name === "get_property_details") {
        resultText = await getPropertyDetailsForChatbot(String(input.slug ?? ""));
      } else if (toolUse.name === "compare_properties") {
        const slugs = Array.isArray(input.slugs) ? input.slugs.map(String) : [];
        const result = await comparePropertiesForChatbot(slugs);
        properties = result.properties;
        resultText = result.summary;
      } else if (toolUse.name === "calculate_emi") {
        resultText = calculateEmi(input as { price: number; downPaymentPercent?: number; tenureYears?: number; interestRatePercent?: number });
      } else if (toolUse.name === "get_featured_listings") {
        properties = await getFeaturedListingsForChatbot();
        resultText =
          properties.length > 0
            ? `${properties.length} featured listing(s) found, already shown as clickable cards — introduce them briefly as our top-promoted picks.`
            : "No featured listings available right now.";
      } else if (toolUse.name === "save_lead") {
        const result = await saveLead(
          input as { name?: string; phone?: string; interest?: string; propertySlug?: string },
          whatsappNumber
        );
        resultText = result.resultText;
        whatsappLink = result.whatsappLink;
      } else {
        resultText = "Unknown tool.";
      }

      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: resultText });
    }

    messages.push({ role: "user", content: toolResults });
    response = await anthropic.messages.create({ model: MODEL, max_tokens: 300, system, tools: TOOLS, messages });
  }

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new ChatbotError("emptyResponse");

  return { reply: text.text, properties, whatsappLink };
}
