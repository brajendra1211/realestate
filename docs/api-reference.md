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
    "documents": [{ "type": "RERA_CERTIFICATE|TRADE_LICENSE|GST_CERTIFICATE|OTHER", "url": "string" }]
  }
  ```
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

_Not started._

## Phase 3 — Money Automation

_Not started._

## Phase 4 — Geolocation & Dispatch

_Not started._

## Phase 5 — Trust & Retention

_Not started._

## Phase 6 — Growth Layer

_Not started._
