// "Did anything change?" counters that power automatic page refresh.
//
// Every successful write to a model bumps that model's counter (see the Prisma
// extension in src/lib/prisma.ts). A logged-in browser asks /api/live for a token
// built from the counters that matter to its role, and refreshes its page when the
// token changes. That is how an admin sees a user's action (and a user sees an
// admin's action) without anyone pressing reload.
//
// The counters live in this server process. Kept on globalThis so dev hot-reload
// does not reset them.

type LiveState = { counters: Map<string, number>; seq: number; boot: number };
const g = globalThis as unknown as { __liveState?: LiveState };
const state: LiveState = (g.__liveState ??= { counters: new Map(), seq: 0, boot: Date.now() });

export function bumpModel(model: string) {
  state.counters.set(model, ++state.seq);
}

// High-churn tables that carry no state anyone watches. Ignoring them keeps the
// admin page from refreshing on every OTP or page view.
const NOISY = new Set(["OtpCode", "PropertyRingLog", "AgentListingRingLog", "PropertyVisitLog", "PushToken", "LeadView"]);

const AGENT = [
  "User", "AgentProfile", "AgentListing", "AgentListingImage", "SavedAgentListing", "Property", "Deal", "Subscription",
  "CommissionLedgerEntry", "PayoutRequest", "DispatchRequest", "DispatchNotification", "Broadcast", "BroadcastResponse",
  "AgentChatMessage", "ListingRequest", "BuyerInterest", "BuyerInterestAcceptance", "InvestorProfile", "Brochure",
  "BrochureRecharge", "VisitAppointment", "DirectPropertyVisit", "PropertyUnlock", "SupportTicket", "AgentRating",
  "AgentWarning", "DocumentVaultItem", "AgentShopUnlock", "AreaAgentAssignment", "AgentDocument",
];
const INVESTOR = [
  "User", "InvestorProfile", "InvestorLedgerEntry", "ProfitDistribution", "DocumentVaultItem",
  "CustomerInvestorAgreement", "Deal", "AgentProfile",
];
const CUSTOMER = [
  "User", "Property", "PropertyImage", "Enquiry", "SavedProperty", "Subscription", "ListingRequest", "DispatchRequest",
  "DispatchNotification", "PropertyUnlock", "VisitAppointment", "DirectPropertyVisit", "BuyerInterest",
  "BuyerInterestAcceptance", "SupportTicket", "AgentListing", "AgentProfile", "AgentChatMessage", "GoldListingPurchase",
  "AgentRating", "Deal",
];

function modelsFor(role: string): string[] | "all" {
  switch (role) {
    case "ADMIN":
    case "SUBADMIN":
      return "all";
    case "AGENT":
      return AGENT;
    case "INVESTOR":
      return INVESTOR;
    default:
      return CUSTOMER;
  }
}

/** Opaque token: it changes whenever any model relevant to this role is written. */
export function liveTokenFor(role: string): string {
  const wanted = modelsFor(role);
  let sum = 0;
  let max = 0;
  for (const [model, n] of state.counters) {
    if (wanted === "all" ? NOISY.has(model) : !wanted.includes(model)) continue;
    sum += n;
    if (n > max) max = n;
  }
  return `${state.boot}.${max}.${sum}`;
}
