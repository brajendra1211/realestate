import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicListings, getListingBySlug } from "@/lib/listing";
import { getWebsiteListings, getWebsiteListingDetail } from "@/lib/websiteListings";
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
): Promise<{ properties: ChatProperty[]; exact: boolean }> {
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

  // Each tier drops one more constraint than the last — city is kept
  // longest (changing city entirely rarely matches intent), bedrooms is
  // dropped first (most likely to over-narrow a sparse inventory).
  const tiers: Array<(l: RawMatch) => boolean> = [
    (l) =>
      (!input.city || matchesCity(input.city, l.city, l.locality)) &&
      (!input.propertyType || l.propertyType === input.propertyType) &&
      (!input.bedrooms || l.bedrooms === input.bedrooms) &&
      (!input.minPrice || l.price >= input.minPrice) &&
      (!input.maxPrice || l.price <= input.maxPrice),
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

  const properties = matches.slice(0, MAX_RESULTS).map(
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

  return { properties, exact };
}

function summarizeResultsForModel(properties: ChatProperty[], exact: boolean) {
  if (properties.length === 0) return "No listings matched those criteria right now, even after widening the search.";
  const lines = properties
    .map((p) => `${p.title} — ${p.bedrooms ?? "?"}BHK, ${formatPrice(p.price, p.listingType as "SALE" | "RENT")}, ${p.locality ?? p.city} (slug: ${p.slug})`)
    .join("; ");
  const matchNote = exact
    ? "These exactly match what was asked."
    : "These DON'T all exactly match every criterion (the search widened automatically because an exact match had too few results) — say so honestly, e.g. mention these are the closest options rather than claiming they're exact matches.";
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

// --- save_lead -----------------------------------------------------------

async function saveLead(input: { name?: string; phone?: string; interest?: string; propertySlug?: string }) {
  if (!input.name || !input.phone) return "Missing name or phone — ask the visitor for both before saving.";

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

  return "Lead saved successfully. Thank the visitor warmly and let them know our team will reach out shortly.";
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
];

// Static knowledge about the platform — kept here rather than pulled live
// from the DB/schema, since this is "how does the site work" explainer
// content for visitors, not personalized or frequently-changing data.
function buildSystemPrompt(siteName: string) {
  return `You are Guddy AI — ${siteName}'s own sales and support agent, not just an FAQ bot. You work this chat exactly like a good human channel partner would: understand what the visitor actually wants, search real listings for them, answer anything about a specific property or the platform in real detail, and gently but genuinely move every serious visitor toward sharing their contact so our team can close the deal.

Your job, in order of priority:
1. As soon as the visitor gives you ANYTHING to search with — even just a city, or just "2BHK", or just "rent" — call search_properties right away with whatever you have. Inventory is limited, so searching immediately and showing what's actually available is more useful than interrogating them for every field first. Only ask a clarifying question if they've given you nothing at all to go on (e.g. just "hi" or "I want a flat" with zero other detail).
2. If they ask more about a specific result, use get_property_details for the real address/amenities/contact instead of guessing.
3. Once a visitor is seriously engaged (reacted positively to a result, asked for contact/visit, or wants to list/sell/rent/become a partner), ask for their name and phone number so our team can follow up — frame it as helping them move faster ("Main aapka number note kar loon? Humari team aapko property visit arrange karne ke liye call karegi"), then call save_lead immediately once you have both.
4. Be genuinely persuasive about why ${siteName} is worth choosing — verified channel partners, zero brokerage for owners, instant ring-a-partner notifications, secure OTP login — but only where it's relevant to what they're asking, never as a generic sales pitch.

This is a live chat conversation, not an article or a support ticket reply. Follow these rules strictly:
- Reply in 1-3 short sentences. Never write more than one short paragraph.
- Write in plain conversational text only — no markdown, no **bold**, no bullet/numbered lists, no headings. If you must list a couple of things, write them inline separated by commas or "and".
- Match the visitor's language and tone — reply in Hindi/Hinglish if they write in Hindi/Hinglish, in English if they write in English.
- Search results are shown as clickable cards automatically — never re-describe each one in text, just introduce them briefly.
- Never say a property was found if the tool returned none — say so honestly and suggest widening the search (different city, budget, or BHK) instead.
- If search_properties tells you the results don't all exactly match (search widened automatically), say so honestly — e.g. "exact match nahi mila, lekin ye closest options hain" — never present a widened/approximate result as an exact match.
- Never fabricate a price, address, amenity, or contact detail — only state what search_properties or get_property_details actually returned.

What ${siteName} offers:
- Buy, Rent, Commercial, and Plot listings across Noida & NCR, searchable by city, locality, budget, and BHK.
- A channel partner (verified agent) marketplace — each partner has a shop profile and a QR code. Scanning a partner's QR code unlocks their verified profile and listings.
- "Ring a channel partner" — from a listing, a buyer can instantly notify the agent (app push notification + WhatsApp) that they're interested, instead of waiting for a callback.
- Zero-brokerage property listing — property owners can list directly with zero brokerage fees.
- An "unlock" model for some listings — a small one-time fee (around ₹100) reveals full address and the channel partner's direct contact.
- Secure sign-in via OTP (WhatsApp or email) for buyers, channel partners, and investors — no passwords to remember.
- A Channel Partner program: agents can register, build a shop profile, list properties, and earn commission/splits on deals.
- An Investor program for people who want to invest in property deals through the platform.
- Dispatch: a buyer can request a nearby channel partner to visit a location, routed to the closest available verified partner.
- Ratings and visit history for channel partners, so buyers can see how reliable a partner has been.

How to get started:
- Buyers: tap "Sign in", verify with an OTP, then browse or search listings. Save properties, scan a partner's QR code, or ring a partner directly from a listing.
- Property owners: use "List a property" / "Post Property Free" — list directly with zero brokerage.
- Agents/channel partners: use "Register" to become a channel partner, set up a shop profile, and start listing.
- Investors: use the Investor sign-in to register and view opportunities.

If you don't know something specific and no tool can answer it (account-specific details, a human policy question), say so honestly and suggest contacting support, rather than guessing.`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function askGuddyAI(
  history: ChatMessage[]
): Promise<{ reply: string; properties: ChatProperty[] }> {
  const anthropic = getClient();
  if (!anthropic) throw new ChatbotError("notConfigured");

  const trimmed = history.slice(-MAX_TURNS);
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
    throw new ChatbotError("invalidHistory");
  }

  const { siteName } = await getSiteSettings();
  const system = buildSystemPrompt(siteName);
  const messages: Anthropic.MessageParam[] = trimmed.map((m) => ({ role: m.role, content: m.content }));

  let properties: ChatProperty[] = [];
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
        resultText = summarizeResultsForModel(result.properties, result.exact);
      } else if (toolUse.name === "get_property_details") {
        resultText = await getPropertyDetailsForChatbot(String(input.slug ?? ""));
      } else if (toolUse.name === "save_lead") {
        resultText = await saveLead(input as { name?: string; phone?: string; interest?: string; propertySlug?: string });
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

  return { reply: text.text, properties };
}
