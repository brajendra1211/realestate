# API Reference

Growing, phase-by-phase reference for every REST API endpoint in the Agent + Investor +
Commission platform (see `docs/platform-requirements.md` for the full spec and roadmap).
Each phase's PR/commit appends its own section here — nothing gets removed, only added to.

## How to read this

- **Auth**: unless marked "Public", every endpoint requires a NextAuth session cookie
  (the same cookie the website uses after `/login`). There is **no token-based auth yet** —
  that's an open TODO before a native mobile app can call these endpoints directly; see
  "Open items" at the bottom.
- **Response envelope**: on success, the raw JSON object/array is returned directly (no
  `{success, data}` wrapper). On failure, the body is `{ "error": "<code or message>" }`
  with a non-2xx status.
- **Why both a web page and an API route exist for the same action**: the website's forms
  use Next.js Server Actions (`"use server"` functions), matching the rest of this
  codebase's convention. The API routes below call the *exact same* underlying functions
  in `src/lib/agent.ts` / `src/lib/investor.ts`, so there is one implementation of every
  business rule — the API route is simply the entry point a future mobile app (or any
  other external client) will use instead of a form submission.

---

## Phase 1 — Agent + Investor Foundation

Identity + verification only. No listings, payments automation, dispatch, or chat yet
(see `docs/platform-requirements.md` §7 for what's still to come).

### `POST /api/agent/register`
- **Auth**: Public
- **Purpose**: Submit a new agent application (profile + compliance docs) for admin
  verification. Upload each compliance PDF first via `POST /api/upload/document`
  (existing endpoint — returns `{filename, url}`), then pass the resulting URLs here.
- **Request body**:
  ```json
  {
    "name": "string", "email": "string", "phone": "string?", "alternatePhone": "string?",
    "password": "string (min 8 chars)",
    "shopName": "string", "shopAddress": "string", "city": "string",
    "yearsExperience": "number?", "staffCount": "number?",
    "reraNumber": "string?", "gstNumber": "string?",
    "documents": [{ "type": "RERA_CERTIFICATE|TRADE_LICENSE|GST_CERTIFICATE|OTHER", "url": "string" }],
    "referredByAgentCode": "string?"
  }
  ```
  `referredByAgentCode` (Phase 3 addition, §3.20) — an existing agent's Agent Code, if this
  agent was referred by another agent. Resolved to `AgentProfile.referringAgentId` at
  registration; the referral commission itself is only credited later, when this agent's Prime
  plan first activates (see the §3.20 section under Phase 3 below).
- **201 response**: `{ "userId": "string", "agentProfileId": "string", "status": "PENDING" }`
- **400**: `{ "error": "validation" | "shopDetails" | "duplicate" }`
- **Used by**: `src/app/register/agent/page.tsx` today, via the Server Action
  `registerAgent` in `src/app/register/agent/actions.ts` (same underlying
  `submitAgentApplication` in `src/lib/agent.ts`). Primary intended consumer: the future
  mobile app's agent sign-up screen.

### `GET /api/agent/me`
- **Auth**: AGENT session
- **Purpose**: The logged-in agent's own profile — verification status, Agent Code,
  Prime status, wallet balance, linked documents/investors.
- **200 response**: the `AgentProfile` row, including `documents[]` and `investors[]`.
- **401**: not an agent / not logged in. **404**: no `AgentProfile` yet.
- **Used by**: not yet wired into the website (the web dashboard reads this data directly
  via `getAgentByUserId` in a Server Component, `src/app/agent/dashboard/page.tsx`).
  Intended for the mobile app's agent home screen.

### `GET /api/agent/commissions`
- **Auth**: AGENT session
- **Purpose**: The agent's full commission ledger plus totals grouped by the 5
  `CommissionType` categories (§3.14 of the spec — these must never be merged into one
  number in any UI).
- **200 response**: `{ "entries": CommissionLedgerEntry[], "totals": Record<CommissionType, number> }`
- **Used by**: not yet wired into the website (`src/app/agent/dashboard/page.tsx` reads
  `getAgentCommissionSummary` directly). Intended for the mobile app's earnings screen.

### `GET /api/agent/investors`
- **Auth**: AGENT session
- **Purpose**: List investors this agent has referred.
- **200 response**: `InvestorProfile[]`
- **Used by**: not yet wired into the website (`src/app/agent/investors/page.tsx` reads
  `getInvestorsForAgent` directly). Intended for the mobile app.

### `POST /api/agent/investors`
- **Auth**: AGENT session, and the agent must be `APPROVED` + `primeStatus: true`
- **Purpose**: Register a new investor under this agent's code. Creates the investor's
  `User` + `InvestorProfile` with `feeStatus: PENDING` — the ₹20,000 registration fee and
  Investor Code come later, once admin confirms payment.
- **Request body**: `{ "name": "string", "email": "string", "phone": "string" }`
- **201 response**: `{ "userId": "string", "investorProfileId": "string" }`
- **400**: `{ "error": "validation" | "duplicate" | "agentNotFound" }`
- **403**: `{ "error": "notPrime" }`
- **Used by**: `src/app/agent/investors/new/page.tsx` today, via the Server Action
  `createInvestor` in `src/app/agent/investors/new/actions.ts` (same underlying
  `registerInvestor` in `src/lib/investor.ts`). Intended for the mobile app too.

### `GET /api/admin/agents`
- **Auth**: ADMIN session
- **Query params**: `status` = `PENDING` (default if omitted or invalid) | `APPROVED` | `REJECTED`
- **Purpose**: The verification queue.
- **200 response**: `AgentProfile[]` including `user` and `documents`.
- **Used by**: not yet wired into the website (`src/app/admin/agents/page.tsx` queries
  Prisma directly for the same data). Exists for an eventual admin mobile/companion app.

### `POST /api/admin/agents/{id}/approve`
- **Auth**: ADMIN session
- **Purpose**: Mark an agent's application `APPROVED` (still needs a separate Prime
  activation before they get an Agent Code).
- **200 response**: the updated `AgentProfile`.
- **Used by**: `src/app/admin/agents/page.tsx`'s Approve button, via the Server Action
  `approveAgentAction` in `src/app/admin/agents/actions.ts` (same underlying
  `approveAgent` in `src/lib/agent.ts`).

### `POST /api/admin/agents/{id}/reject`
- **Auth**: ADMIN session
- **Request body**: `{ "reason": "string" }` (required)
- **200 response**: the updated `AgentProfile`.
- **400**: `{ "error": "A rejection reason is required" }`
- **Used by**: `src/app/admin/agents/page.tsx`'s Reject form, via `rejectAgentAction`.

### `POST /api/admin/agents/{id}/activate-prime`
- **Auth**: ADMIN session
- **Purpose**: Assign a Prime `Plan` (an admin-manual stand-in for the "agent pays →
  auto-debit" flow described in the spec, since no payment gateway exists yet — see §5 of
  `docs/platform-requirements.md`). On success, generates and sets the Agent Code
  (`AGT-<CITY>-<SEQ>`) and flips `primeStatus: true`.
- **Request body**: `{ "planId": "string" }`
- **200 response**: the updated `AgentProfile` (now with `agentCode`).
- **400**: `{ "error": "planId is required" | "notFound" | "notVerified" | "planNotFound" }`
- **Used by**: `src/app/admin/agents/page.tsx`'s "Activate Prime" form, via
  `activatePrimeAction`.

### `GET /api/admin/investors`
- **Auth**: ADMIN session
- **Query params**: `feeStatus` = `PENDING` | `PAID` (omit for all)
- **200 response**: `InvestorProfile[]` including `user` and `referringAgent`.
- **Used by**: not yet wired into the website (`src/app/admin/investors/page.tsx` queries
  Prisma directly).

### `POST /api/admin/investors/{id}/confirm-payment`
- **Auth**: ADMIN session
- **Purpose**: Confirm the ₹20,000/year registration fee was received (manual, same reason
  as above — no payment gateway yet). Sets `feeStatus: PAID`, generates the Investor Code
  (`INV-<seq>`), sets a 365-day `expiresAt`, and — in one transaction — credits the
  referring agent ₹2,000 (10%) as a `CommissionLedgerEntry` of type
  `REGISTRATION_REFERRAL` and increments their `walletBalance`.
- **200 response**: the updated `InvestorProfile`.
- **400**: `{ "error": "notFound" }`
- **Used by**: `src/app/admin/investors/page.tsx`'s confirm-payment button, via
  `confirmInvestorPaymentAction` in `src/app/admin/investors/actions.ts`.

### Reused from before Phase 1

- `POST /api/upload/document` — unchanged, `auth()`-gated, PDF only, max 15MB. Used by the
  agent registration form's 3 compliance-document uploads (`DocumentUploadField.tsx`) the
  same way it's already used for property brochures.

### Not built yet (deliberately out of scope for Phase 1)

- **No Investor-facing login/portal or `/api/investor/me`.** Investors have no password
  set at registration — in Phase 1 they're managed entirely through their referring
  Agent and Admin. A self-service Investor Portal (per §3.14 of the spec) is expected in a
  later phase alongside real payments.
- **No token-based auth for external/mobile clients.** All endpoints above currently
  authenticate via the same NextAuth session cookie the website uses. A mobile app will
  need a proper token flow (e.g. NextAuth's credential login returning a bearer token, or
  a dedicated `/api/auth/token` exchange) — flag this before native app work starts.

---

## Phase 2 — Listings + Deduplication

Master Property IDs (one per physical flat, shared across co-listing agents), an agent
"list a property" flow with location-based dedup, and a teaser → paid-unlock flow for
public visitors. Entirely new tables (`MasterProperty`, `AgentListing`,
`AgentListingImage`, `PropertyUnlock`) — the existing OWNER/DEALER `Property` marketplace
(`/properties`) is untouched.

> **No payment gateway is wired in for the ₹100 unlock** — `POST /api/listings/{slug}/unlock`
> simulates instant success (see `src/lib/unlock.ts`). This is the one seam to replace with
> real Razorpay capture in Phase 3 ("Money Automation," per `docs/platform-requirements.md`
> §5/§7) — everything downstream of "payment succeeded" (50/50 split-credit, reveal, notify)
> is already the real implementation, not a stub.

### `POST /api/agent/listings/dedup-search`
- **Auth**: AGENT session
- **Purpose**: Geocode an address and return any `MasterProperty` candidates within 200m
  (same-building tightness — §3.2's "address/geofence match").
- **Request body**: `{ "city": "string", "locality": "string?", "address": "string" }`
- **200 response**: `{ "latitude": number, "longitude": number, "candidates": MasterPropertyCandidate[] }`
  where each candidate also has `distanceKm`.
- **400**: `{ "error": "validation" | "geocode" }`
- **Used by**: `src/app/agent/listings/new/page.tsx`'s Step 1 form, via the Server Action
  `searchMasterProperty` (same underlying `findNearbyMasterProperties` in
  `src/lib/masterProperty.ts`). Intended for the mobile app's "list a property" flow.

### `POST /api/agent/listings`
- **Auth**: AGENT session, agent must be `APPROVED` + `primeStatus: true`
- **Purpose**: Create an `AgentListing`, either attached to an existing `MasterProperty`
  (pass `masterPropertyId`) or minting a new one (omit it — a new Master Property ID is
  generated from `city`/`latitude`/`longitude`).
- **Request body**:
  ```json
  {
    "masterPropertyId": "string?", "city": "string", "locality": "string?",
    "latitude": "number", "longitude": "number",
    "title": "string", "description": "string",
    "listingType": "SALE|RENT", "propertyType": "APARTMENT|VILLA|INDEPENDENT_HOUSE|PLOT|COMMERCIAL|OFFICE",
    "bedrooms": "number?", "bathrooms": "number?", "areaSqft": "number?",
    "price": "number", "exactAddress": "string", "amenities": "string? (comma-separated)",
    "images": ["string (uploaded image URLs)"]
  }
  ```
- **201 response**: the created `AgentListing`, including `images` and `masterProperty`.
- **400**: `{ "error": "validation" | "noLocation" }`. **403**: `{ "error": "notPrime" }`
- **Used by**: `src/app/agent/listings/new/confirm/page.tsx`'s Step 2 form, via the Server
  Action `submitAgentListing` (same underlying `createAgentListing` in `src/lib/listing.ts`).

### `GET /api/agent/listings`
- **Auth**: AGENT session
- **200 response**: the agent's own `AgentListing[]`, including `images`, `masterProperty`,
  and an `unlocks` count.
- **Used by**: not yet wired into the website (`src/app/agent/listings/page.tsx` queries
  `getListingsForAgent` directly). Intended for the mobile app.

### `POST /api/agent/listings/upload-image`
- **Auth**: AGENT session
- **Purpose**: Upload one listing photo. Server-side: cropped to a fixed 1280×720, a text
  watermark composited on (site name, bottom-right), re-encoded as webp
  (`saveAgentListingImage` in `src/lib/upload.ts`, additive — the existing
  `saveUploadedImage` used by Property/Project listings is untouched).
- **Request**: `multipart/form-data` with a `file` field (JPEG/PNG/WEBP, ≤8MB).
- **201 response**: `{ "filename": "string", "url": "string" }`
- **Used by**: `AgentListingImagesField.tsx` (client-side downscales via the Canvas API
  before upload, purely to cut bytes — the server crop/watermark/webp step above is what
  actually enforces the spec).

### `GET /api/listings`
- **Auth**: Public
- **Query params**: `city`, `listingType` (`SALE`|`RENT`)
- **Purpose**: Public teaser browse/search.
- **200 response**: `AgentListing[]` (full row shape — this listing endpoint is not
  field-gated; field-level teaser/unlock gating only applies to the single-listing detail
  endpoint below).
- **Used by**: `src/app/listings/page.tsx` (reads `getPublicListings` directly today).

### `GET /api/listings/{slug}`
- **Auth**: Public (behavior changes if the caller has a BUYER session)
- **Purpose**: The teaser-vs-unlocked detail view.
- **200 response (not unlocked)**: Master Property ID, city/locality, type, price,
  bed/bath/area, amenities, photos, description — `exactAddress`/agent fields omitted,
  `"unlocked": false`.
- **200 response (unlocked)**: everything above plus `exactAddress`, `agentCode`,
  `agentName`, `agentPhone`, `shopName`, `shopLatitude`/`shopLongitude`, `"unlocked": true`.
- **404**: `{ "error": "notFound" }`
- **Used by**: `src/app/listings/[slug]/page.tsx` (queries `getListingBySlug` +
  `getUnlockForBuyer` directly and renders the same gating in JSX). This route is the JSON
  equivalent for the mobile app.

### `POST /api/listings/{slug}/unlock`
- **Auth**: BUYER session (redirect through `/buyer/login?next=/listings/{slug}` if absent —
  the existing OTP login flow, `src/app/buyer/login/actions.ts` /
  `src/app/buyer/verify/actions.ts`, now threads a `next` param through so login returns
  the buyer to the listing they were unlocking)
- **Purpose**: Pay ₹100 (simulated, see the warning above) → idempotent unlock. In one
  transaction: creates a `PropertyUnlock` row, credits the referring agent ₹50 as a
  `CommissionLedgerEntry` of type `UNLOCK_SPLIT`, increments their `walletBalance`. Then
  notifies the agent (wallet credited) via the existing `notifyUser`.
- **201 response**: the `PropertyUnlock` row (idempotent — calling again for the same
  buyer+listing returns the existing row, no double-charge).
- **400**: `{ "error": "notFound" }`
- **Used by**: `src/app/listings/[slug]/page.tsx`'s "Pay ₹100 & Unlock" button, via the
  Server Action `unlockListing` in `src/app/listings/[slug]/actions.ts` (same underlying
  `unlockAgentListing` in `src/lib/unlock.ts`).

### Reused from Phase 1

- `POST /api/upload/document`, the whole Server-Action-plus-matching-REST-route
  architecture, and the `notifyUser`/wallet-crediting `$transaction` shape from
  `confirmInvestorPayment` (`src/lib/investor.ts`) — `unlockAgentListing` follows the exact
  same three-step pattern (record → ledger entry → balance increment) for the ₹50 split.

## Phase 3 — Money Automation

Master Commission Calculator, agent wallet → bank payouts with automatic TDS, multi-mode
payment tracking, a self-service Investor Portal, and the §3.20 agent-to-agent referral
commission. New tables (`Deal`, `ProfitDistribution`, `InvestorLedgerEntry`, `PayoutRequest`)
plus a `PaymentMode` enum, `SiteSettings.tdsPercent` (admin-editable, default 5%), and
`AgentProfile.referringAgentId` (self-relation) with a new `AGENT_REFERRAL` `CommissionType`.

**Confirmed with the client before building (resolving `docs/platform-requirements.md` §6):**
brokerage is 100% to the agent, no company cut (§6.3); TDS is a flat, admin-editable percentage
(default 5%) applied at payout time, not per-transaction type; the §3.20 agent-referral
commission is one-time, 10% of the referred agent's first Prime payment — the same shape as
§3.11's investor referral, not a recurring override (§6 item 6).

Real Razorpay integration is now wired in (`src/lib/razorpay.ts`) for the ₹100 unlock pass —
order creation + signature verification, same REST-call-not-SDK pattern as `src/lib/whatsapp.ts`.
It's inert until `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set in `.env`; every payment path
checks `isRazorpayConfigured()` first and falls back to the pre-existing simulated/instant flow
when it's false, so nothing breaks in an environment without keys.

### §3.12–§3.14 checklist (updated as each point ships)

- [x] §3.12 — Buyer's agent 1% brokerage
- [x] §3.12 — Seller's agent 1% brokerage
- [x] §3.13 — 10/10/40/40 investor deal profit split, one action
- [x] §3.13 — Agent's registration-referral vs. deal-profit-share kept as separate ledger lines (never merged)
- [x] §3.14 (Investor Portal) — Total active investment capital, admin-recordable
- [x] §3.14 (Investor Portal) — Date-wise profit ledger with customer-transaction ref + hold-duration (days)
- [x] §3.14 (Investor Portal) — Agreement & document vault access — **out of scope**, this is §3.10/Phase 5
- [x] §3.14 (Agent Portal) — Commission broken into distinct categories, never merged
- [x] §3.14 (Agent Portal) — Wallet balance
- [x] §3.14 (Agent Portal) — List of linked Investor Codes + live deal status
- [x] §3.14 (Agent Portal) — Linked-agent chat, broadcast inbox, calendar/CRM board — **out of scope**, this is §3.6/§3.7/Phase 4
- [x] §3.14 (Admin Panel) — Master hierarchy map: Agent Code → Investor Code → Customer/Property Unit
- [x] §3.14 (Admin Panel) — One-click Master Commission Calculator
- [x] §3.14 (Admin Panel) — TDS & company-handling-charge deduction engine
- [x] §3.14 (Admin Panel) — Deal-wise + date-wise ledger, fully historical
- [x] §3.14 (Admin Panel) — Renewal alert system for investor 1-year expiries
- [x] §3.14 (Admin Panel) — Multi-mode payment tracker (Bank/Cheque/Cash/UPI/NetBanking)
- [x] §3.14 (Admin Panel) — Live financial analytics: net profit, total investor returns, agent payouts, operating expenses
- [x] §3.14 (Admin Panel) — Document vault management — **out of scope**, this is §3.10/Phase 5
- [x] §3.14 (Admin Panel) — 2-hour dispute SLA — **out of scope**, support-desk process, not software
- [x] §3.20 — Agent-to-agent referral commission (one-time, 10% of first Prime payment)
- [x] REST API mirrors for every Phase 3 Server Action (mobile-app parity, matching Phase 1/2's convention)
- [x] Real Razorpay integration for the ₹100 unlock pass (inert without keys, simulated fallback intact)

Items marked "out of scope" are intentionally excluded from Phase 3 (they belong to a later
phase per §7) — not forgotten, just not this phase's job. Everything else above is now closed
out; see the sections below for what each item actually does.

### `POST /api/admin/investors/{id}/confirm-payment` (updated)

- **Request body (new)**: `{ "paymentMode": "BANK_TRANSFER"|"CHEQUE"|"CASH"|"UPI"|"NETBANKING" }`
  (optional, defaults to `BANK_TRANSFER`). Stored on `InvestorProfile.feePaymentMode` — the
  multi-mode payment tracker required by §3.14.
- Everything else about this endpoint is unchanged from Phase 1.

### Admin — Deals & Commissions (`/admin/deals`)

- **`GET /api/admin/deals`** — `getDealHistory()`, the brokerage deal history table.
- **`POST /api/admin/deals`** — REST mirror of `recordDeal` below. Body:
  `{ dealValue, buyerAgentId?, sellerAgentId?, paymentMode, note? }`. **201** the created `Deal`.
- **`POST /api/admin/deals/profit-distribution`** — REST mirror of `distributeInvestorDealProfit`
  below. Body: `{ investorProfileId, totalProfit, paymentMode, note?, customerTransactionRef? }`.
  **201** the created `ProfitDistribution`.

- **`recordDeal`** (`src/lib/deal.ts`) — the brokerage half of the One-click Master Commission
  Calculator (§3.12/§3.14). Given a deal value and up to two agents (buyer-side, seller-side),
  computes 1% each via `computeBrokerage` (`src/lib/commission.ts`), credits each agent's
  wallet 100% (no company cut — confirmed §6.3), writes a `Deal` row + one `CommissionLedgerEntry`
  (type `BROKERAGE`) per side, and notifies each agent.
- **`distributeInvestorDealProfit`** (`src/lib/investor.ts`) — the investor-profit half (§3.13).
  Given an investor and a total deal profit, `computeProfitSplit` returns
  `{agentShare: 10%, expenseShare: 10%, investorShare: 40%, companyShare: 40%}` (the company
  share absorbs any rounding remainder so the four lines always sum exactly to the input). In
  one transaction: writes a `ProfitDistribution` row (the full 4-way split, for the Admin
  Master Panel's ledger), a `CommissionLedgerEntry` (type `DEAL_PROFIT_SHARE`) + wallet credit
  for the referring agent, and an `InvestorLedgerEntry` for the investor — kept as separate
  ledgers per §3.14's "never merge" rule.
- Both forms are on one page with a combined deal-wise/date-wise history table underneath
  (§3.14's "Deal-wise + date-wise ledger, fully historical").
- The profit-distribution form also takes an optional **customer transaction ref**, stored on
  the resulting `InvestorLedgerEntry.customerTransactionRef` — see the Investor Portal section
  below for why (§3.14's ledger spec: "date, customer transaction, hold duration (days),
  credited profit").

### Admin — Investors (`/admin/investors`, updated)

- **`POST /api/admin/investors/{id}/capital`** — REST mirror of `updateInvestorCapital`
  (`src/lib/investor.ts`). Body: `{ totalInvested }`. Admin sets an investor's "Total active
  investment capital" (§3.14 Investor Portal spec) — a snapshot admin edits directly, not a
  running sum of ledger credits (the two are independent numbers: capital in vs. profit out).
- **`getInvestorsExpiringSoon`** — renewal alert banner at the top of `/admin/investors` listing
  every `PAID` investor whose `expiresAt` is within 30 days (including already-expired), per
  §3.14's "Renewal alert system for investor 1-year expiries." Server Component read only, no
  REST route (it's just the existing `GET /api/admin/investors` data, client-side would filter
  the same way).

### Admin — Master Hierarchy Map (`/admin/hierarchy`, new)

Read-only tree view: Agent Code → Investor Code → deal cycle (§3.14's "Master hierarchy map:
Agent Code → Investor Code → Customer/Property Unit"). The leaf level is each
`ProfitDistribution` row rather than a Master Property ID — the platform doesn't attach a
property to an investor deal cycle yet (that link needs Phase 4/5's dispatch/CRM work first),
so the customer transaction ref entered on the profit-distribution form stands in for "which
deal" until that link exists.

### Admin — Financial Analytics (`/admin/analytics`, new)

- **`GET /api/admin/analytics`** — REST mirror, returns the same shape `getFinancialAnalytics()`
  returns to the page.

`getFinancialAnalytics` (`src/lib/analytics.ts`) — §3.14's "Live financial analytics: net
profit, total investor returns, agent payouts, operating expenses." Company revenue is
computed only from lines that are actually the company's money:

- `ProfitDistribution.companyShare` (40% company line from investor deal profit splits)
- `PropertyUnlock.companySplit` (50% company line from the ₹100 unlock pass)
- The non-referral 90% of every `PAID` investor's ₹20,000 registration fee

Agent commissions (brokerage, referrals, unlock splits) were never company money, so
**total agent payouts is reported as a separate cash-out metric, not subtracted from net
profit** — net profit is company revenue minus `ProfitDistribution.expenseShare` only.

### Admin — Agent Payouts (`/admin/payouts`)

- **`GET /api/admin/payouts`** — `getPendingPayouts()`, all `status: PENDING` requests.
- **`POST /api/admin/payouts/{id}/process`** — REST mirror of `processAgentPayout` below. Body:
  `{ paymentMode }` (optional, defaults `BANK_TRANSFER`).
- **`POST /api/admin/payouts/{id}/reject`** — REST mirror of `rejectAgentPayout` below. No body.
- **`requestAgentPayout`** (`src/lib/payout.ts`, called from the agent dashboard) — agent asks
  to withdraw part/all of their wallet balance. Reserves the gross amount immediately
  (decrements `walletBalance`) and computes TDS via `computeTds` against the current
  `SiteSettings.tdsPercent`, storing a `PayoutRequest` with `status: PENDING`.
- **`processAgentPayout`** — admin confirms the net amount was actually transferred (any
  `PaymentMode`); marks `PAID`, notifies the agent with the gross/TDS/net breakdown.
- **`rejectAgentPayout`** — credits the reserved gross amount back to the agent's wallet, marks
  `REJECTED`.
- TDS percentage itself is edited at `/admin/settings` → "Payments" section
  (`SiteSettings.tdsPercent`), not hardcoded — per the client's own note that finance may need
  to correct it later.

### Agent — Payout request (`/agent/dashboard`)

- **`GET /api/agent/payouts`** — `getPayoutsForAgent()`, the calling agent's own payout history.
- **`POST /api/agent/payouts`** — REST mirror of `requestAgentPayout`. Body: `{ amount }`.
  **201** the created `PayoutRequest`. **400** `{ "error": "validation" | "insufficientBalance" | "notFound" }`.
- The dashboard's existing wallet balance card now has a "Withdraw to bank" form
  (`requestPayoutAction` → `requestAgentPayout`) plus a payout history list (gross/TDS/net,
  status).

### Investor Portal (new — `/investor/login`, `/investor/verify`, `/investor/dashboard`)

Phase 1 deliberately shipped without investor login ("expected in a later phase alongside real
payments" — this is that phase). Investors authenticate via a new `investor-otp` NextAuth
Credentials provider (`src/auth.ts`), reusing the exact OTP mechanism `buyer-otp` already uses
(`src/lib/otp.ts`) — the only difference is `investor-otp` **never auto-creates a user**: it
requires an existing `User` with `role: INVESTOR`, which only exists once an agent has
registered them (§3.11). Logging in with an unregistered phone/email fails with the same
"invalid code" message as a wrong OTP (deliberately not distinguishing the two, so the flow
can't be used to enumerate which numbers are registered investors).

- `/investor/login` — enter phone/email, mirrors `/buyer/login`.
- `/investor/verify` — enter the 6-digit code, mirrors `/buyer/verify`.
- **`GET /api/investor/me`** — Investor session required. The logged-in investor's own
  `InvestorProfile` (investor code, capital, expiry, referring agent). **404** if none.
- **`GET /api/investor/ledger`** — Investor session required. `getInvestorLedger()`'s shape:
  `{ entries, distributions, totalProfit }`.
- `/investor/dashboard` — active investment capital (admin-set, see above), total profit
  credited (from `InvestorLedgerEntry`), referring agent, registration expiry, the date-wise
  profit ledger (each row shows its customer transaction ref and hold duration in days when
  present), and a deal-by-deal table of `ProfitDistribution` rows showing the investor's 40%
  share alongside the total deal profit and payment mode (transparency into the full split, not
  just their own line). No document vault yet — that's §3.10/Phase 5, still unbuilt.
- `holdDurationDays` on each ledger entry is computed at distribution time as
  `distributedAt − InvestorProfile.registeredAt` — there's no separate per-capital investment
  date in the schema yet, so it's measured from when the investor's registration became active.

### Agent Portal (`/agent/investors`, updated)

- The investor list now shows each linked investor's **live deal status** — count of
  `ProfitDistribution` cycles and the most recent one's date — instead of just fee/active
  status, closing out §3.14's "List of linked Investor Codes + live deal status."

### §3.20 — Agent-to-Agent Referral Commission (new)

Resolved per `docs/platform-requirements.md` §6 item 6: **one-time**, 10% of the referred
agent's first Prime subscription payment — the direct parallel to §3.11's investor referral,
not a recurring override.

- `AgentProfile.referringAgentId` — new self-relation field, set at registration.
- **`POST /api/agent/register`** (updated) — request body gains an optional
  `"referredByAgentCode": "string"`. If present, it's resolved to an existing agent's
  `AgentProfile.id` at registration time (**400** `{ "error": "referrerNotFound" }` if the code
  doesn't exist) and stored — but no commission is credited yet at this point.
- **`activateAgentPrime`** (`src/lib/agent.ts`, called from
  `POST /api/admin/agents/{id}/activate-prime`) — updated. The referral credit fires **only on
  this agent's first-ever Prime activation** (detected as `agent.agentCode` being null before
  this call — i.e. before an Agent Code has ever been minted for them), never on renewals. When
  it fires: 10% of `plan.price`, credited to the referring agent as a `CommissionLedgerEntry` of
  a **new, distinct** `CommissionType`: `AGENT_REFERRAL` (never merged with
  `REGISTRATION_REFERRAL`, which is investor-referral only — per §3.14's never-merge rule).
- Shows up as a 4th line, "Agent Referral (10%, one-time)", in the Agent Portal's commission
  breakdown (`GET /api/agent/commissions`, `/agent/dashboard`) — that response's `totals` object
  now always includes an `AGENT_REFERRAL` key alongside the original five.

### Razorpay — Real Payment Integration (new, ₹100 unlock pass)

`src/lib/razorpay.ts` — plain `fetch` calls against the Razorpay REST API (no SDK dependency,
same pattern as `src/lib/whatsapp.ts`). `isRazorpayConfigured()` gates every caller; without
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in `.env` it's a no-op and the pre-existing
simulated/instant unlock (`unlockAgentListing`) is used exactly as before.

- **`src/app/listings/[slug]/page.tsx`** now branches: `isRazorpayConfigured()` true → renders
  the new client component `UnlockButton` (`src/components/UnlockButton.tsx`); false → renders
  the original plain `<form action={unlockListing}>` (zero client JS, unchanged behavior).
- **`createUnlockOrderAction`** (Server Action, `src/app/listings/[slug]/actions.ts`) — buyer
  session required. Calls `createUnlockOrder` (`src/lib/unlock.ts`): if already unlocked,
  returns `{ alreadyUnlocked: true }`; else creates a real Razorpay order (`amount: 100`,
  `receipt: "unlock_<listingId>_<buyerId>"`) and returns it plus the publishable key ID for
  Checkout to open against.
- `UnlockButton` loads `checkout.razorpay.com/v1/checkout.js` client-side, opens Checkout with
  that order, and on success calls:
- **`verifyUnlockPaymentAction`** (Server Action) — buyer session required. Calls
  `verifyAndUnlockListing` (`src/lib/unlock.ts`), which HMAC-verifies
  `razorpay_order_id|razorpay_payment_id` against `razorpay_signature` using the key secret
  (`verifyRazorpayPaymentSignature`, constant-time compare) **before** calling the same
  `unlockAgentListing` used by the simulated path — so the 50/50 wallet split, reveal, and
  notify logic is identical either way; only how "payment succeeded" gets proven differs.
- No REST route for this flow (browser-driven Checkout modal, not a headless client) — a native
  mobile app would need its own Razorpay Checkout SDK integration calling the same
  `createUnlockOrder`/`verifyAndUnlockListing` lib functions, not these Next.js Server Actions.

### Not built yet (deliberately out of scope for Phase 3)

- **Document vault** (§3.10) — referenced from the Investor Portal's future scope but not built;
  still Phase 5.
- **Escrow/token flow** (`docs/platform-requirements.md` §6 item 4) — still unspecified by the
  client; not attempted.
- **Razorpay for other payment legs** (investor registration fee, agent Prime subscription) —
  only the ₹100 unlock pass got real-payment wiring this round; those two still go through the
  admin-confirmed flow. Same `src/lib/razorpay.ts` helpers would extend to them later.

## Phase 4 — Geolocation & Dispatch

Uber-style cascade dispatch (§3.5) and B2B agent-to-agent broadcast + chat (§3.6), on a real
Socket.io + Redis + BullMQ stack — the client's own suggested tech, not a polling substitute
(explicitly requested; see `docs/platform-requirements.md` §5). New tables (`DispatchRequest`,
`DispatchNotification`, `Broadcast`, `BroadcastResponse`, `AgentChatMessage`) plus
`DispatchStatus`, `BroadcastStatus`, `BroadcastTxnType` enums.

**Requires `REDIS_URL` and the custom server.** Every dispatch/broadcast/chat feature below is
inert without Redis (`isDispatchQueueConfigured()`/`isRedisConfigured()` gate it, matching the
Razorpay/`isRazorpayConfigured()` precedent) and without launching via `server.js` — see
`docs/platform-requirements.md` §5's "Verify" note. Local dev: `docker run -d -p 6381:6379
redis:7-alpine`, then `npm run dev` (now `node server.js`, not `next dev` — use `npm run
dev:turbo` for fast-refresh-only work that doesn't touch real-time features).

**Fixed in passing:** `AgentProfile.shopLatitude/shopLongitude` existed in the schema since
Phase 1 but were never geocoded — `submitAgentApplication` (`src/lib/agent.ts`) now geocodes
the shop address at registration (same Nominatim helper City/Locality/Project already use).
Without this, no agent would ever have coordinates and radius search would find nobody.

**₹100 dispatch trigger — interim decision, not yet client-confirmed** (§6 item 2): reuses the
exact same amount/50-50-split shape as the listing unlock pass rather than a separate charge,
because §3.17's monetization table lists only one "customer unlock pass" revenue line. See
`docs/platform-requirements.md` §6 item 2 for the full reasoning and what's still open.

### Real-time infrastructure

- **`server.js`** — now creates the Socket.io server (`path: "/socket.io"`) and sets
  `globalThis.__io` before `app.prepare()` runs, so it's available to every Server
  Action/API route in the same process (custom-server processes share one `globalThis`).
  Clients `emit("join", {...})` immediately on connect to join one of four room shapes:
  `agent:<agentProfileId>`, `dispatch:<dispatchRequestId>`, `broadcast:<broadcastId>`, or
  `chat:<broadcastId>:<sortedAgentIdA>:<sortedAgentIdB>` (chat is scoped per broadcast *and*
  per agent pair — several agents can each be negotiating the same broadcast independently, so
  a plain per-broadcast room would leak one pair's messages into another's open thread).
- **`src/lib/socket.ts`** (server) / **`src/lib/socketClient.ts`** (browser) — thin
  `emitToAgent`/`emitToDispatch`/`emitToBroadcast`/`emitToChatThread` helpers and a
  singleton client connection, respectively.
- **`src/lib/redis.ts`** — shared `ioredis` singleton (direct commands: `GEOADD`/`GEOSEARCH`).
  BullMQ gets its *own* dedicated connections (`src/lib/queues/dispatchQueue.ts`), not this one
  — it issues blocking commands internally and shouldn't share a client with anything else.
- **`src/lib/queues/dispatchQueue.ts`** — the batch-timeout queue. `scheduleBatchTimeout`/
  `cancelPendingBatchTimeout` use a deterministic `jobId` (`<dispatchId>:<batch>`) so
  re-scheduling the same batch is a no-op rather than a duplicate timer. The Worker is started
  exactly once, from **`src/instrumentation.ts`** — Next.js's official startup hook, which runs
  once per process in both dev and prod regardless of entry point. The job processor
  dynamically `import()`s `src/lib/dispatch.ts` inside the callback (not at module scope) to
  avoid a require-cycle, since `dispatch.ts` itself calls back into this queue module.
- **`src/lib/agentGeo.ts`** — one global Redis geo set (`geo:agents`) of every Prime agent's
  shop location; `GEOSEARCH ... BYRADIUS` for nearest-first lookups. Falls back to a plain
  MySQL query + `haversineDistanceKm` (same pattern as Phase 2's `findNearbyMasterProperties`)
  whenever Redis isn't configured, so the feature degrades instead of hard-failing.
  `indexAgentLocation` is called from `activateAgentPrime` every time Prime activates
  (including renewals) so a re-indexed agent's location is never stale.

### Dispatch (`/dispatch/new`, `/dispatch/{id}`, agent dashboard's "Incoming leads")

- **`POST /api/dispatch`** — Buyer session required. Body `{ latitude, longitude }`. If
  Razorpay isn't configured: creates the `DispatchRequest` immediately (simulated flow) and
  returns `{ simulated: true, dispatchRequestId }`, **201**. If configured: returns
  `{ simulated: false, order, keyId }` for client-side Checkout to open against — same
  create-order-then-verify shape as the unlock pass. **503** `{ "error": "paymentUnavailable" }`
  if Razorpay is configured but order creation fails.
- **`POST /api/dispatch/verify`** — Buyer session required. Body:
  `{ latitude, longitude, razorpayOrderId, razorpayPaymentId, razorpaySignature }`. Verifies
  the signature (`verifyRazorpayPaymentSignature`, same HMAC check as the unlock flow) before
  creating the `DispatchRequest` and cascading batch 1. **201** `{ dispatchRequestId }`.
- **`GET /api/dispatch/{id}`** — the calling buyer's own dispatch only (**404** otherwise).
- **`POST /api/dispatch/{id}/accept`** — Agent session required. The atomic claim: an
  `updateMany` guarded by `WHERE status = 'SEARCHING'`, so if two agents accept in the same
  instant only the first actually matches a row — the second gets **400**
  `{ "error": "alreadyMatched" }`. **400** `{ "error": "notNotified" }` if this agent was never
  part of this dispatch's cascade. On success: 50% of ₹100 credited to the agent's wallet
  (`CommissionLedgerEntry` type `UNLOCK_SPLIT` — same revenue line as the listing unlock, see
  the interim-decision note above), the pending batch-timeout job cancelled, every other
  notified agent gets a `dispatch:cancelled` push, and the buyer gets `dispatch:matched`.
- **`POST /api/dispatch/{id}/cancel`** — Buyer session required, only while `SEARCHING`.
- **`GET /api/agent/dispatch`** — every `SEARCHING` dispatch this agent is still a candidate
  for (the dashboard widget's initial-load seed; Socket.io covers everything after that).
- **Cascade mechanics** (`src/lib/dispatch.ts`): batch size 8 ("5-10 nearest" — §3.5), radius
  ladder `[1, 3, 5]` km. Each batch notifies the nearest not-yet-notified Prime agents at the
  current rung, pushes `dispatch:new` to each agent's room and `dispatch:batch` to the buyer's
  radar, and arms a 60-second BullMQ job. If that job fires with the dispatch still
  `SEARCHING` on the same batch number, it widens to the next radius rung and notifies a fresh
  batch; if a rung finds zero new agents at the ladder's max (5km), the dispatch is marked
  `EXPIRED` and the buyer is notified via `notifyUser` (WhatsApp/email — see the Push
  notifications row in `docs/platform-requirements.md` §5 for why not FCM/Twilio).
- **`/agent/dispatch/{id}`** — the accepted lead's full detail (buyer name/phone/email),
  gated by `acceptedByAgentId` actually matching the requesting agent.

### B2B Broadcast + Chat (`/agent/broadcast`, `/agent/broadcast/new`, `/agent/broadcast/{id}/chat/{agentId}`)

- **`GET /api/agent/broadcast`** — Prime agent session required. Open broadcasts within radius
  of *this* agent's own shop location (a live radius query, not a persisted notification list
  — unlike dispatch, a broadcast is one-shot, not a cascade, so there's no batch state to track).
- **`POST /api/agent/broadcast`** — creates a `Broadcast` centered on the posting agent's shop
  location and pushes `broadcast:new` to every Prime agent found within `radiusKm` (no batching
  — "push card alert to every active agent in that radius", §3.6). Body:
  `{ radiusKm, society?, flatSize, txnType, budgetMin, budgetMax }` where `txnType` is one of
  `RENT`/`BUY`/`SELL`/`LETOUT` (all four — this is the agent-facing B2B enum, deliberately
  separate from the customer-facing Buy/Rent-only `ListingType`, confirming §6 item 7's already-
  noted coexistence). **400** `{ "error": "validation" }` / `{ "error": "noLocation" }` if the
  posting agent has no shop coordinates yet.
- **`GET /api/agent/broadcast/own`** — the calling agent's own posted broadcasts, each with its
  `BroadcastResponse[]` (who clicked "I Have This Property").
- **`GET /api/agent/broadcast/societies?radiusKm=`** — "Society (auto-populated for that
  radius)" — §3.6. Reuses `MasterProperty.locality` (this app's closest existing concept to
  "society") within the given radius of the calling agent's shop; powers
  `src/components/agent/BroadcastSocietyField.tsx`'s cascading dropdown (same
  fetch-on-change pattern as `GeoCascadeFields.tsx`).
- **`POST /api/agent/broadcast/{id}/respond`** — "I Have This Property". Idempotent
  (`upsert` on `[broadcastId, agentId]`) — clicking twice doesn't create two response rows.
  **400** `{ "error": "ownBroadcast" }` if you try to respond to your own posting.
- **`POST /api/agent/broadcast/{id}/close`** — poster-only, marks the broadcast `CLOSED`.
- **`GET /api/agent/broadcast/{id}/chat/{agentId}`** — message history between the calling
  agent and `{agentId}`, scoped to this one broadcast.
- **`POST /api/agent/broadcast/{id}/chat/{agentId}`** — Body `{ message }`. **400**
  `{ "error": "notParticipant" }` unless both agents are either the broadcast's poster or have
  a `BroadcastResponse` on it — the thread is scoped to a real negotiation, not an open DM.
  Delivers via `emitToAgent` (a `chat:notification` badge ping, works from anywhere in the app)
  and `emitToChatThread` (the actual message, only reaches an open thread for this exact pair).

### Not built yet (deliberately out of scope for Phase 4)

- **FCM push / Twilio SMS-voice** (§3.5's suggested stack) — needs new Firebase/Twilio
  accounts, and FCM specifically needs a mobile/PWA push-subscription target this app doesn't
  have. In-app Socket.io + the existing WhatsApp/email `notifyUser` fallback stand in for now.
- **Masked calling** (Exotel/Twilio, §3.3) — still simulated; real phone numbers are shown
  directly once unlocked/matched, not proxied through a masking service.
- **§3.7 Calendar/Meeting Board/CRM** and **§3.8 Anti-poaching/OTP visit logging** — separate
  Phase 5 modules, not attempted here even though they're geo/visit-adjacent.
- **REST mirror for the `join` room-subscription step** — inherently a Socket.io client
  operation (`socket.emit("join", ...)`), not a request/response REST action; there's nothing
  to mirror.

## Phase 5 — Trust & Retention

OTP-gated visit logging with cross-agent conflict detection (§3.8), 5-star ratings + a 3-strike
warning system + switch-agent flow (§3.9), and a code-scoped document vault (§3.10). New tables
(`PropertyVisitLog`, `AgentRating`, `AgentWarning`, `CustomerAgentBlock`, `AgentSwitchLog`,
`DocumentVaultItem`, `CustomerInvestorAgreement`) plus `DocumentVaultType`, and a new
`AgentProfile.ratingAvg` field. Reuses Phase 4's Socket.io infra for the real-time conflict
alert and the existing OTP primitives (`src/lib/otp.ts`) for visit verification — no new
infrastructure needed for this phase.

### Anti-Poaching / Visit Logging (`/agent/visits/new` → `/agent/visits/verify` → `/agent/visits`)

- **`POST /api/agent/visits/otp`** — Agent session required. Body `{ customerPhone }`. Sends an
  OTP to the customer's phone (same `requestOtp` buyer/investor login already uses — the agent
  triggers it, the customer reads the code back to them in person). **502** `{ "error": "send" }`
  if delivery fails.
- **`POST /api/agent/visits`** — Agent session required. Body:
  `{ customerPhone, customerName?, masterId, otp }`. Verifies the OTP, then:
  - **First-ever visit** for this `customerPhone` + Master Property ID combination: logged as
    `isPrimaryOwner: true`, no alert.
  - **Every subsequent visit by a different agent** for the same pair: logged as
    `isPrimaryOwner: false`, `conflictWithAgentId` set to the *original* agent — Primary Lead
    Ownership never moves, no matter how old that first visit is. The original agent gets a
    real-time `visit:conflict` push (`emitToAgent`, same Socket.io room Phase 4's dispatch uses)
    plus a WhatsApp/email alert via `notifyUser`, with the customer's phone masked
    (`XXXX1234`) in the message. The response includes the full cross-agent visit history
    (`getCustomerVisitHistory`) and the original agent's code/visit date, so the UI can show the
    "🚨 duplicate — original agent keeps ownership" banner immediately.
  - Same agent re-visiting their own earlier log: not a conflict, logged normally.
  - **400** `{ "error": "invalidOtp" | "propertyNotFound" }`.
- **`GET /api/agent/visits`** — the calling agent's own visit log history.
- Note: `docs/platform-requirements.md` §3.8's suggested "Redis cache + SQL query" for the
  conflict check was implemented as a plain indexed Prisma query
  (`@@index([customerPhone, masterPropertyId])`) — fast enough at this scale without adding a
  cache layer; Redis is still used for the *alert* delivery (Socket.io), just not the lookup.

### Ratings (`/rate/{agentCode}`, public — no login required)

- **`POST /api/rate/{agentCode}`** — Public. Body: `{ customerPhone, stars (1-5), review? }`.
  Creates an `AgentRating` and recomputes `AgentProfile.ratingAvg` as the plain average of all
  ratings (no weighting/decay). **400** `{ "error": "validation" }` for an out-of-range star
  value. **404** if the Agent Code doesn't exist.
- **`GET /api/agent/ratings`** — Agent session required. `{ ratings: AgentRating[], count }`.
- **"Top Rated Prime Agent" badge** (`isTopRatedAgent` in `src/lib/rating.ts`) — §3.9 doesn't
  specify exact numbers, so this is an implementation call: `ratingAvg >= 4.5` **and**
  `count >= 5` (a sample-size floor so one 5-star rating can't earn it). Shown on the agent
  dashboard and `/admin/trust`.
- Linked from the buyer's dispatch radar (`DispatchRadar.tsx`) once an agent accepts —
  "Rate this agent after your visit."

### Warnings, Complaints & Switch-Agent (`/admin/trust`, buyer dashboard's "Your current agent")

- **`GET /api/buyer/switch-agent`** — Buyer session required. Returns
  `canSwitchAgent(customerPhone)`'s gate: `{ allowed: true }` or
  `{ allowed: false, reason: "dailyLimitReached" | "cooldown", nextAllowedAt? }` — the exact
  abuse guardrails from §3.9 (max 3/day, checked against a rolling 24h window; a
  1.5h cooldown, the midpoint of the spec's "1-2 hour" range).
- **`POST /api/buyer/switch-agent`** — Buyer session required. Body:
  `{ fromAgentId, reason, isComplaint, latitude, longitude }`. `reason` is mandatory
  (**400** `{ "error": "reasonRequired" }` if blank — enforced server-side, not just a
  disabled button). Re-checks the abuse gate (**400** with the same `dailyLimitReached`/
  `cooldown` codes as the GET). Finds a replacement agent via `findReplacementAgent`
  (`src/lib/agentSwitch.ts`): reuses Phase 4's `findNearbyAgents` Redis Geo lookup, excludes
  the outgoing agent and every agent this customer has formally complained about, excludes
  agents past the warning threshold, and ranks by existing-listing count in the area before
  distance (the "weighted toward agents who know the micro-area" call — §3.9 doesn't define
  this precisely).
  - If `isComplaint: true`: also creates a `CustomerAgentBlock` (idempotent per
    customer+agent pair — that agent is now permanently excluded from this customer's future
    replacement searches, §3.9's "must never be re-shown"). Every 3rd *total* complaint against
    an Agent Code (counted across all customers, not just this one — `recordComplaint` in
    `src/lib/agentSwitch.ts`) creates an `AgentWarning`, increments `AgentProfile.warningCount`,
    and notifies the agent. At `warningCount >= 3` an agent stops appearing as a replacement
    candidate in any future switch (the "visible ranking drop" — enforced by exclusion from
    matching, not a separate ranking field).
- `/admin/trust` — read-only queues: recent duplicate-visit conflicts, formal complaints,
  warnings issued, and a top-rated-agents leaderboard.

### Document Vault (`/agent/documents`, `/investor/documents` read-only, `/admin/documents`)

- **`GET/POST /api/agent/documents`** — Agent session required. POST body:
  `{ title, type, url, masterId? }` — `type` is one of `REGISTRY` / `SALE_DEED` /
  `AGREEMENT_TO_SELL` / `ENCUMBRANCE_CERTIFICATE` / `LAYOUT_PLAN` / `PAYMENT_RECEIPT` /
  `SIGNED_AGREEMENT` / `OTHER`. Reuses the existing `saveUploadedDocument` PDF pipeline
  (`POST /api/upload/document`, same one agent compliance docs use) — upload the file first,
  pass the resulting URL here.
- **`GET /api/investor/documents`** — Investor session required. Read-only:
  `{ documents: DocumentVaultItem[], agreements: CustomerInvestorAgreement[] }`. Investors view
  and download; they don't upload — matches §3.10's "visible... downloadable" phrasing, which
  never mentions investor-side upload.
- **Admin** (`/admin/documents`, Server Actions only, no REST mirror — admin-only bulk/back-
  office tooling, not something a mobile client needs) — uploads on behalf of any Agent Code or
  Investor Code by typing the code (resolved server-side), and a separate form for
  `CustomerInvestorAgreement` (§3.10's named sub-requirement: customer name/contact, agreement
  date, lock-in period, unit number, terms, signed copy).
- Every vault item requires an owning `agentId` or `investorId` (§3.10: "visible only inside
  the relevant Agent Code / Investor Code dashboards" — an item with neither would be visible
  nowhere, so `uploadDocument` rejects that with **400** `{ "error": "noOwner" }`).

### Not built yet (deliberately out of scope for Phase 5)

- **§3.7 Calendar/Meeting Board/CRM** (shared visit-slot booking, no-show escalation to a fresh
  5-10 agent broadcast, reminders) — a separate module from §3.8's visit *logging*; not
  attempted this phase.
- **Leaderboard ticker** ("Deal done today" scrolling ticker) — that's §3.18 Gamification,
  Phase 6, not this phase's job even though it's rating/trust-adjacent.

## Phase 6 — Growth Layer

Gold Membership self-listing (§3.4) and gamification (§3.18) — the last of the six phases.
Extends `AgentListing` (built in Phase 2) with a nullable `agentId`, a `source`
(`AGENT`/`CUSTOMER_GOLD`) and an `approvalStatus` field, plus a new `GoldListingPurchase` table
and `ListingSource` enum. No new infrastructure — reuses Phase 4's Redis Geo push for
auto-injection and the same Razorpay order/verify pattern as the ₹100 unlock/dispatch charges.

### Schema change with knock-on effects: `AgentListing.agentId` is now nullable

A Gold self-listing with no referring agent code genuinely has no agent — §3.4: "if the
customer self-registered with no agent code, the company's number is shown... not any specific
agent's." Every place that previously assumed `listing.agent` always exists was updated:

- **`src/lib/unlock.ts`** (`unlockAgentListing`) — when `listing.agentId` is null, the ₹100
  unlock's agent-side `CommissionLedgerEntry`/wallet-credit/notification are skipped entirely
  (`agentSplit: 0, companySplit: 100` on the `PropertyUnlock` row) rather than crashing on a
  null `.agent.user` access.
- **`src/app/listings/[slug]/page.tsx`** and **`GET /api/listings/{slug}`** — the unlocked view
  branches: agent present → unchanged Phase 2 behavior (agent name/phone/shop); agent absent →
  shows the society's locality (`masterProperty.locality`) and `SiteSettings.contactPhone`
  instead.
- **`getPublicListings`** (`src/lib/listing.ts`) — now filters `approvalStatus: "APPROVED"`.
  Agent-created listings default `APPROVED` (unchanged Phase 2 behavior, so nothing regresses
  for existing agent listings); only `CUSTOMER_GOLD` listings default `PENDING` and stay
  invisible until admin approves them.

### Gold Membership (`/list-property/gold` → `/list-property/gold/submitted`)

- **`POST /api/gold-listings`** — Buyer session required. Body: full listing fields (title,
  description, listingType, propertyType, bedrooms/bathrooms/areaSqft, price, city, locality,
  address, amenities, videoUrl, images[], `referredByAgentCode?`). Geocodes `address + city`
  server-side (§3.4's customers don't go through the agent's two-step dedup-search — "system
  auto-assigns a Master Property ID"). Same order-creation branch as dispatch/unlock: Razorpay
  configured → `{ simulated: false, order, keyId, input }` for client-side Checkout; not
  configured → creates the listing immediately, `{ simulated: true, slug }`. **400**
  `{ "error": "noLocation" }` if geocoding fails.
- **`POST /api/gold-listings/verify`** — Buyer session required. Body:
  `{ input, razorpayOrderId, razorpayPaymentId, razorpaySignature }` (the same `input` object
  the create call returned). Verifies the signature, then runs the identical creation logic as
  the simulated path — split calculation, referral credit, `PENDING` moderation status.
- **`POST /api/gold-listings/upload-image`** — Buyer session required (not Agent — the only
  difference from `POST /api/agent/listings/upload-image`). Same `saveAgentListingImage`
  pipeline (crop to 1280×720 + watermark), reused via
  `src/components/agent/AgentListingImagesField.tsx`'s new `endpoint` prop rather than
  duplicating the component.
- **Referral split** (`createGoldListingRecord` in `src/lib/goldListing.ts`): 50% (₹250)
  credited to the referring agent's wallet as a `CommissionLedgerEntry` of type `GOLD_SPLIT`
  (an enum value that existed in the schema since Phase 1's original draft but was unused until
  now) — **immediately on payment**, independent of whether the listing is later approved or
  rejected. No referring agent code → `agentSplit: 0`, all ₹500 is `companySplit`.
- **`GET /api/admin/gold-listings`** — Admin session required. `PENDING` `CUSTOMER_GOLD`
  listings awaiting moderation ("anti-fake-listing check" — §3.4), oldest first.
- **`POST /api/admin/gold-listings/{id}/approve`** — sets `approvalStatus: "APPROVED"`, then
  auto-injects: `findNearbyAgents` (Phase 4's Redis Geo lookup) within 5km of the listing's
  coordinates, pushes `listing:new-gold` to each agent's Socket.io room. This is a one-shot
  push, not a persisted per-agent notification row or a cascade — see `getGoldListingsForAgent`
  below for how the agent-side feed actually surfaces it.
- **`POST /api/admin/gold-listings/{id}/reject`** — sets `approvalStatus: "REJECTED"`; never
  goes public, never gets injected. The referral commission (if any) already went to the agent
  and is **not** reversed on rejection — see the "immediately on payment" note above.
- **`GET /api/agent/gold-listings`** — Prime agent session required. Every `APPROVED`
  `CUSTOMER_GOLD` listing within 5km of the calling agent's own shop, tagged "Direct Customer
  Listing" in the UI — a live radius query (`getGoldListingsForAgent`), not a stored
  notification list, matching Phase 4 broadcast's same "one-shot push, not stateful cascade"
  reasoning. Any Prime agent (not just the referrer) can see it and "can still visit and upload
  their own better-quality photos on top of the same Master ID" per §3.4 — that's just a normal
  co-listing `AgentListing` row against the same `masterPropertyId`, unchanged Phase 2 behavior.

### Gamification (`/leaderboard`, public — no login required)

- **`GET /api/leaderboard`** — Public. Returns `{ agentsOfWeek, ticker, areaDominance }` from
  `src/lib/gamification.ts`, all three computed live (nothing is a stored/curated title):
  - **Agents of the Week** — up to 3 cards, one per badge (`TOP_SELLER` = most commission
    earned in the trailing 7 days; `FASTEST_RESPONDER` = lowest average time between a dispatch
    notification and that agent's accept, trailing 7 days; `"5-STAR"` = highest `ratingAvg`
    agent meeting `isTopRatedAgent`'s threshold from Phase 5). A single agent can legitimately
    win more than one badge — they're not deduped into one card, since each badge means
    something different.
  - **Deal ticker** — every brokerage `Deal`, investor `ProfitDistribution`, and matched
    `DispatchRequest` from today, merged and sorted newest-first — §3.18's "24-hour scrolling
    ticker of same-day deal closers."
  - **Area dominance** — per locality (falling back to city), the agent with the most
    `APPROVED` listings, only surfaced once they have at least 3 (`MIN_LISTINGS_FOR_DOMINANCE`
    — a threshold call, since §3.18 doesn't specify one) — §3.18's "King of Sector-74"-style tag.
- Linked from `/listings`. WhatsApp click-to-chat button on each Agents of the Week card uses
  the agent's raw phone number (masked calling via Exotel/Twilio, per §3.3, was never built —
  same gap noted in Phase 4's docs).

### Not built yet (deliberately out of scope for Phase 6 — and not planned for any future phase without new client input)

- **AI photo-fraud/duplicate detection** (§3.16) and **AI auto-matching recommender**
  (top-3-society suggestions) — the client's own doc calls both "Special Notes... not specified
  in workflow detail — treat as backlog, not MVP" (§6 item 5). No workflow, no acceptance
  criteria, no model/vendor choice exists to build against; attempting either now would mean
  inventing requirements rather than implementing the client's spec.
- **Prime Booster Badge purchase flow** (₹1,499/month top-of-search boost) — §3.17's
  monetization table lists it as a "proposed upsell," not a specified feature with its own
  workflow. Not built; would need its own mini-spec (what "top of search" actually changes,
  billing cadence, cancellation) before implementation.
- **Masked calling** (Exotel/Twilio) — still simulated everywhere it's referenced (§3.3's
  unlock reveal, this phase's WhatsApp click-to-chat); real phone numbers are shown directly.

## §3.7 — Calendar / Meeting Board / CRM

Built last, after all six numbered phases — §7's roadmap never assigned this module a phase
number, so it sat unbuilt until this pass closed it out. New table (`VisitAppointment`) plus
`AppointmentStatus` enum. No new infrastructure: reuses Phase 4's BullMQ pattern for reminders
and its entire dispatch cascade engine for no-show escalation.

### Scheduling (`/agent/dispatch/{id}` → schedule form, `/agent/appointments`, buyer dashboard)

- **`POST /api/agent/appointments`** — Agent session required. Body:
  `{ buyerId, masterId?, scheduledAt }`. **400** `{ "error": "mustBeFuture" }` if `scheduledAt`
  isn't in the future. Generates a `bookingCode` (`BK-000001`, same sequential-code convention
  as `generateAgentCode`/`generateInvestorCode` in `src/lib/codes.ts` — "the customer's existing
  unique booking code" the no-show flow reuses), schedules a reminder job, notifies both parties.
- **`GET /api/agent/appointments`** — the calling agent's own scheduled visits.
- **`POST /api/agent/appointments/{id}`** — Body `{ action: "complete" | "cancel" }`.
  Completing sets `followUpDueAt` to 3 days out ("full audit trail: visit date, inquiry date,
  follow-up due date" — §3.7); cancelling also cancels the pending reminder job.
- **`GET /api/buyer/appointments`** — the calling buyer's own scheduled visits, each with an
  `isDue` boolean (`scheduledAt` has passed) computed server-side in `getAppointmentsForBuyer`
  rather than the calling page component — a page component calling `Date.now()` directly
  trips React's "components must be pure" lint rule, even in a Server Component.
- **Reminders** (`src/lib/queues/reminderQueue.ts`) — a dedicated BullMQ queue (not reusing
  Phase 4's dispatch queue — different job shape, different worker), delayed job fires 1 hour
  before `scheduledAt`, `notifyUser`s both buyer and agent, sets `reminderSentAt`. Worker started
  from `src/instrumentation.ts` alongside the dispatch-cascade worker.

### No-show escalation (`POST /api/buyer/appointments/{id}/no-show`)

- Buyer session required, and only the appointment's own buyer can flag it. **400**
  `{ "error": "notScheduled" }` if it's not currently `SCHEDULED`, `{ "error": "notYetDue" }`
  if `scheduledAt` hasn't passed yet (can't flag a no-show before the visit was even due),
  `{ "error": "noLocation" }` if the appointment has no `masterPropertyId` (nothing to radius-
  scan from).
- On success: marks `NO_SHOW`, cancels any pending reminder, and calls
  **`createFreeDispatchForEscalation`** (`src/lib/dispatch.ts`) — "broadcasts to 5-10 new nearby
  agents using the customer's existing unique booking code" (§3.7). This is *the same cascade
  function* a paid ₹100 dispatch uses (`findNearbyAgents`, batch/radius widening, Socket.io
  push, BullMQ timeout, `acceptDispatch`'s race-guarded claim) with two differences: `amount: 0`
  (no new charge — the customer already paid once for this engagement) and the no-show agent is
  passed as a pre-excluded candidate so they can never be re-matched to their own miss.
  `acceptDispatch` was updated to read the split off the `DispatchRequest` row itself instead of
  a hardcoded constant, so accepting a free escalation correctly credits nothing (previously it
  would have wrongly credited the standard ₹50, a bug caught while building this).
- Response: `{ appointment, escalationDispatchId }` — the client redirects to
  `/dispatch/{escalationDispatchId}`, the exact same live radar page a paying customer sees.

### Bug fixed while building this: Redis Geo index drift

`findNearbyAgents` (`src/lib/agentGeo.ts`) could return an agent ID from Redis that no longer
existed in MySQL (an index that drifted after an agent was removed, or a leftover key from a
stopped process) — every caller downstream creates rows with a foreign key to `AgentProfile`,
so this crashed the whole cascade (dispatch, broadcast, no-show escalation, anything using this
function) with a raw `P2003` foreign-key error instead of degrading gracefully. Fixed by
cross-validating Redis's candidate list against live `AgentProfile` rows (`primeStatus: true`)
before returning — stale IDs are now silently dropped rather than crashing their caller.

## Gap-closing pass — 4 items found missing on re-verification against `platform-requirements.md`

After Phase 6 and §3.7 shipped, a full re-read of the spec against the actual codebase turned up
four points that were specified but not built. All four are now built, migrated, and wired into
`src/instrumentation.ts`'s worker/scheduler startup.

### §3.1 — Prime wallet auto-debit renewal + demotion (`src/lib/billing.ts`)

- No new user-facing endpoint — this is a BullMQ repeatable job (`billingQueue.ts`,
  `upsertJobScheduler`, daily 3am, `"0 3 * * *"`) plus an admin manual-trigger action.
- `checkAllPrimeRenewals()` finds every `ACTIVE` subscription with `endDate <= now` (deliberately
  *not* filtered by `Plan.role`, since a `"BOTH"`-role plan would otherwise be missed — the real
  gate is "does this subscriber have an `AgentProfile`") and calls `renewOrDemoteAgent` per row.
- `renewOrDemoteAgent(agentProfileId, subscriptionId)`: if `agent.walletBalance >= plan.price`,
  debits the wallet, cancels the old subscription, creates a new `ACTIVE` one with an extended
  `endDate`, and notifies the agent. Otherwise marks the subscription `EXPIRED`, sets
  `agent.primeStatus = false`, calls `removeAgentFromIndex` (immediate Redis Geo removal so a
  demoted agent stops receiving dispatch broadcasts instantly, not just at the next cron tick),
  and notifies the agent that they were demoted.
- `acceptDispatch` (`src/lib/dispatch.ts`) now re-checks `agent.primeStatus` before letting an
  accept go through — an agent demoted *after* being notified of a batch can no longer accept it;
  the batch just times out and cascades onward, same as if they'd never responded. New dispatch
  error code: `notPrime`, surfaced on `/agent/dashboard` as "Your Prime plan isn't active —
  reactivate it to accept new leads."
- **Admin — Prime Billing (`/admin/billing`, new)**: shows the count of subscriptions currently
  due, a list of demoted agents (agents with an `agentCode` — i.e. activated at least once — but
  `primeStatus: false`), and a "Run billing check now" button (`runBillingCheckAction`) that
  calls `checkAllPrimeRenewals()` directly, for testing/on-demand use outside the 3am schedule.

### §3.2 — Daily digest for Prime agents (`src/lib/digest.ts`)

- `GET /api/agent/digest` — Prime-agent session required. Returns
  `getNewListingsDigest(agent.id)`: `AgentListing` rows created in the last 24h, `approvalStatus:
  APPROVED`, excluding the agent's own listings, filtered to within 10km of the agent's shop
  (Haversine, same pattern as every other radius query in this codebase), grouped by
  locality + bedroom count.
- `/agent/digest` (new page) — on-demand view of the same digest, gated on `agent.primeStatus`.
  Linked from the agent sidebar.
- Delivery: `digestQueue.ts`, BullMQ repeatable job (`upsertJobScheduler`, `"0 9 * * *"`, 9am
  daily) calling `sendDailyDigests()`, which iterates all Prime agents with shop coordinates and
  calls `notifyUser` for anyone whose digest has `totalCount > 0`.

### §3.15 — Nearby-amenity auto-tagging (`src/lib/amenityLookup.ts`)

- No new endpoint — runs automatically inside `createAgentListing` (`src/lib/listing.ts`) and
  `createGoldListingRecord` (`src/lib/goldListing.ts`) at listing-creation time, given the
  listing's lat/long.
- `getNearbyAmenities(latitude, longitude)` queries OpenStreetMap's Overpass API (free, no key —
  same posture as the existing Nominatim geocoding) for the nearest Metro/Railway station, Bus
  Stand, Hospital, and Grocery Market within 5km, one nearest match per category. Best-effort:
  any failure (timeout, API down, no results) returns `[]` rather than blocking listing creation.
- Result stored as a formatted string (`formatAmenitiesNote`) on the new
  `AgentListing.nearbyAmenities` field — distinct from the pre-existing `amenities` field
  (on-property features like gym/pool); this one is *nearby places*, auto-pulled, never typed by
  the agent.
- Rendered as pill badges in a new "Nearby" section on `/listings/{slug}`, after the existing
  on-property amenities section.
- **Bug fixed while building this:** Overpass returned a bare 406 (silently swallowed by the
  existing "don't block on failure" error handling, so the symptom was just an empty result with
  no visible error) because the request lacked `Accept`/`User-Agent` headers. Fixed by adding
  both, matching what `src/lib/geocode.ts` already sends to Nominatim.

### §3.18 — Direct call button on Agents of the Week (`/leaderboard`)

- No new endpoint — `src/app/leaderboard/page.tsx` already had the WhatsApp `wa.me` link on each
  card; added a `tel:{phone}` link alongside it, same card, same phone number, matching the
  spec's "direct call/WhatsApp button" wording literally instead of just the WhatsApp half.
