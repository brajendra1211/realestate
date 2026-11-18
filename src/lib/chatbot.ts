import Anthropic from "@anthropic-ai/sdk";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicListings } from "@/lib/listing";
import { getWebsiteListings } from "@/lib/websiteListings";
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
const MAX_RESULTS = 5;

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

const SEARCH_TOOL: Anthropic.Tool = {
  name: "search_properties",
  description:
    "Search live property listings on the platform and return real matches. Call this whenever the visitor describes what they're looking for (city, BHK, budget, buy/rent, property type) — actually search and let the UI show them real results, don't just describe the feature in words.",
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
};

type SearchInput = {
  city?: string;
  listingType?: "SALE" | "RENT";
  propertyType?: (typeof PROPERTY_TYPES)[number];
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
};

function isSearchInput(value: unknown): value is SearchInput {
  return typeof value === "object" && value !== null;
}

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
};

type RawMatch = ChatProperty & { propertyType: string };

// Reuses the same two queries GET /api/listings already merges (channel
// partner marketplace + website owner/dealer listings) rather than
// standing up a separate search path for the chatbot.
async function searchPropertiesForChatbot(input: SearchInput): Promise<ChatProperty[]> {
  const filters = { city: input.city, listingType: input.listingType };
  const [agentListings, websiteListings] = await Promise.all([
    getPublicListings(filters),
    getWebsiteListings(filters),
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
      })
    ),
  ];

  const filtered = combined.filter((l) => {
    if (input.propertyType && l.propertyType !== input.propertyType) return false;
    if (input.bedrooms && l.bedrooms !== input.bedrooms) return false;
    if (input.minPrice && l.price < input.minPrice) return false;
    if (input.maxPrice && l.price > input.maxPrice) return false;
    return true;
  });

  return filtered.slice(0, MAX_RESULTS).map(
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
    })
  );
}

// Static knowledge about the platform — kept here rather than pulled live
// from the DB/schema, since this is "how does the site work" explainer
// content for visitors, not personalized or frequently-changing data.
function buildSystemPrompt(siteName: string) {
  return `You are Guddy AI, the friendly assistant for ${siteName} — a real estate platform connecting buyers, renters, and investors with verified channel partners (agents) and property owners across Noida & NCR.

Answer visitor questions about ${siteName} itself: what it does, how its features work, and how to get started. If asked something unrelated to ${siteName} or real estate on the platform, politely redirect to what you can help with.

This is a live chat conversation, not an article or a support ticket reply. Follow these rules strictly:
- Reply in 1-3 short sentences. Never write more than one short paragraph.
- Cover only what the visitor actually asked — don't dump the full feature list unless they ask "what can you do" or similar.
- If there's more to say, end with a short follow-up question ("Want to know how to list a property, or how ringing a partner works?") instead of saying everything at once.
- Write in plain conversational text only — no markdown, no **bold**, no bullet/numbered lists, no headings. If you must list a couple of things, write them inline separated by commas or "and".
- Match the visitor's language and tone — reply in Hindi/Hinglish if they write in Hindi/Hinglish, in English if they write in English.

Searching for properties: whenever the visitor describes what they want to see — a city, BHK count, budget, buy vs rent, or property type — call search_properties with whatever criteria they gave (leave the rest out, don't guess). The results are shown to the visitor as clickable cards in the UI automatically, so in your reply just briefly introduce them (e.g. "Yahan kuch 2BHK options hain Noida mein:") — never re-describe each result in text, and never say a property was found if the tool returned none (say so honestly and suggest widening the search instead).

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

If you don't know something specific (exact current prices, a specific listing, account-specific details), say so honestly and suggest contacting support or checking the relevant page, rather than guessing.`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system,
    tools: [SEARCH_TOOL],
    messages,
  });

  let properties: ChatProperty[] = [];

  // One tool hop per turn — enough for "search then describe the results",
  // without an open-ended agent loop a chat widget doesn't need.
  if (response.stop_reason === "tool_use") {
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use" && toolUse.name === "search_properties") {
      const input = isSearchInput(toolUse.input) ? toolUse.input : {};
      properties = await searchPropertiesForChatbot(input);

      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content:
              properties.length > 0
                ? `${properties.length} matching propert${properties.length === 1 ? "y" : "ies"} found: ${properties
                    .map((p) => `${p.title} (${p.bedrooms ?? "?"}BHK, ${formatPrice(p.price, p.listingType as "SALE" | "RENT")}, ${p.locality ?? p.city})`)
                    .join("; ")}. Already shown to the visitor as clickable cards — don't repeat this list in your reply, just introduce it briefly.`
                : "No listings matched those exact criteria right now.",
          },
        ],
      });

      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 150,
        system,
        tools: [SEARCH_TOOL],
        messages,
      });
    }
  }

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new ChatbotError("emptyResponse");

  return { reply: text.text, properties };
}
