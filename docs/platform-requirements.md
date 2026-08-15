# Agent + Investor + Commission Super-Platform — Consolidated Requirements

Source documents:
- `Hindlenglish Agent And Investor Commission.pdf` (5 pages) — commission/investor logic
- `Agent Registration & Submission Form.pdf` (17 pages) — agent onboarding, listings, dispatch, chat, anti-poaching, gamification
- WhatsApp messages from client, 13 Aug 2026 — two new rules, consolidated into §3.3 and §3.20

This file consolidates both (messy, Hinglish, repetitive) client documents into one build-ready spec: what exists today, what needs to be built, the exact business rules, the data model, the tech stack, and a phased roadmap.

**Build status:** All six phases are built and committed — Phase 1 (Agent + Investor identity/
verification/commission ledger foundation, including the §3.20 agent-to-agent referral
addendum), Phase 2 (Master Property ID dedup + agent listings + teaser/pay-to-unlock), Phase 3
(Master Commission Calculator, agent wallet payouts with automatic TDS, multi-mode payment
tracking, self-service Investor Portal, hierarchy map, financial analytics, REST API mirrors,
and a real-but-optional Razorpay integration for the ₹100 unlock), Phase 4 (Uber-style cascade
dispatch on real Socket.io + Redis + BullMQ, Redis Geo radius search, B2B agent-to-agent
broadcast + live chat), Phase 5 (OTP-gated visit logging + anti-poaching conflict alerts,
5-star ratings, 3-strike warnings + customer-agent switching with abuse guardrails, code-scoped
document vault), and Phase 6 (₹500 Gold Membership self-listing with moderation + auto-injection,
agent gamification leaderboard). §3.7 (Calendar/Meeting Board/CRM — visit scheduling, reminders,
no-show escalation) was also built, closing the one module the numbered roadmap never assigned
to a phase. See `docs/api-reference.md` for the live, endpoint-by-endpoint reference of what's
actually shipped. Two items from the client's own "Special Notes" — AI photo-fraud detection
and an AI auto-matching recommender — were deliberately **not** built; see §6 item 5 and Phase
6's roadmap entry below for why.

---

## 1. Current State of the Codebase (baseline)

`prisma/schema.prisma` today only supports a classic listings marketplace:

- `User` with `Role`: `ADMIN, SUBADMIN, OWNER, DEALER, BUYER` — **no `AGENT` or `INVESTOR` role**
- `Property`, `Project`, `Developer`, `City`/`Locality` — flat listings, no geo lat/long on `Property` itself (only City/Locality have lat/long), no dedup, no Master Property ID
- `Plan` / `Subscription` — generic subscription plans, not tied to agent commission or prime status
- `Enquiry`, `LeadView`, `SavedProperty` — simple lead capture, no pay-to-unlock, no OTP-gated visit logging
- No wallet/ledger, no commission tables, no chat, no geofencing, no dispatch queue, no ratings, no document vault

**Conclusion:** everything in Sections 3–9 below was net-new at the time this was written. The existing marketplace (properties, projects, developers, cities) stays as the "catalog" layer; the new system plugs in as Agent/Investor/Commission/Dispatch layers on top — Phase 1 and Phase 2 of that plan are now built (see "Build status" above); Phases 3 onward are still pending.

---

## 2. Roles & Actors (new, in addition to existing ones)

| Actor | Description |
|---|---|
| **Agent** | RERA-verified broker with a Unique Agent Code (`AGT-DEL-1024`). Lists/co-lists properties, earns brokerage + referral + profit-share commissions. Must hold an active Prime subscription to stay visible. |
| **Investor** | Brings capital (e.g. ₹10L), registered via an Agent, gets an Investor Code, earns a share of company/investor deal profit. |
| **Customer** | Property seeker. Free "teaser" browsing; pays ₹100 to unlock contact/visit or ₹500 for Gold self-listing. |
| **Company / Admin** | Owns the platform, takes a cut of every revenue stream, runs the Master Admin Panel, resolves disputes, manages TDS/payouts. |
| **Investor-as-Agent** | An investor may also register separately as an Agent (needs its own Agent Code — commissions are never merged between the two identities). |

---

## 3. Module Inventory

### 3.1 Agent Registration & Verification (2-phase) — ✅ built (including the auto-debit rule)

**Phase 1 — Profile submission**
- Full name, 2 mobile numbers, email
- Shop/office name & address, years of experience, staff count
- Compliance uploads: RERA registration number/certificate, Property/Trade License, GST number
- Goes to Admin for verification before an agent can transact

**Phase 2 — Subscription & Agent Code**
- After verification, agent selects a **Prime Membership** plan and pays
- On successful payment, system auto-generates a **Unique Agent Code** (`AGT-<CITY>-<SEQ>`)
- Agent Code is the identity used everywhere: listings, commissions, chat, wallet, dispute logs

**Rules**
- Monthly Prime subscription auto-debits from the agent's platform wallet via payment gateway
- If a payment fails, the agent's listings automatically demote in ranking and any pending leads reroute to another agent — the agent is **not** deleted, just deprioritized
- Agent's map pin is fixed to their **registered shop location**, regardless of where in the world they log in from — customers never see their live location, only the shop address

**Auto-debit + demotion — found missing and built in a later pass:** "auto-debits from the
agent's *platform wallet*" (not a card/bank auto-charge) is what made this buildable without a
Razorpay recurring-billing integration — `src/lib/billing.ts`, checked daily via a BullMQ
repeatable job (`src/lib/queues/billingQueue.ts`, 3am). Sufficient wallet balance → deducted,
subscription renewed, agent notified. Insufficient → `primeStatus: false` (demoted, not
deleted), immediately removed from the Redis Geo dispatch/broadcast index
(`removeAgentFromIndex`), and `acceptDispatch` now rejects a demoted agent even if they were
notified before losing Prime — so a pending lead simply times out and cascades to the next
agent, satisfying "pending leads reroute" without any special-case code.

### 3.2 Property Listing & Global Deduplication Engine — ✅ built (daily digest included)

- **Master Property ID** (`PROP-DEL-2026-8891`): one ID per physical flat, forever
- **Multi-Agent Mapping**: many agents can attach themselves to the same Master Property ID (co-listing); each agent's own photos/description show under their own code
- Backend runs a duplication check (address/geofence match) on every new upload before minting a new Master ID vs. attaching to an existing one
- Prime agents get a **daily digest**: "today, in a 1–10 km radius, X new listings were added, in these societies, these configs (2BHK/3BHK)"
- Location is always **agent shop location**, not the flat's exact address, until the customer pays to unlock

**Daily digest — found missing and built in a later pass:** `src/lib/digest.ts` +
`src/lib/queues/digestQueue.ts` (BullMQ repeatable job, 9am daily). Groups every listing
created in the last 24h within 10km of an agent's shop by locality + bedroom count, sends via
`notifyUser`. Also available on-demand at `/agent/digest` — the scheduled push is a convenience
on top of the same underlying query, not the only way to see it.

### 3.3 Customer Discovery — Teaser → Pay-to-Unlock

**Transaction type shown to customers (client update, 13 Aug 2026):** the customer-facing
platform only ever shows **Buy or Rent** — Sell/Letout are not customer-facing transaction
types. Those two extra types stay valid for the agent-to-agent inventory-sourcing flow only
(§3.6, where an agent is browsing *other agents'* stock, not a customer). **Already matches
the Phase 2 implementation** — `AgentListing.listingType` only accepts `SALE`/`RENT` (reusing
the existing marketplace's `ListingType` enum); it does not expose Sell/Letout at all today.
If §3.6's B2B broadcast is built in a later phase with its own Sell/Letout options, don't let
those leak into any customer-facing screen.

**Free tier (glimpse):**
- Visible: Master Property ID, City/Area, Flat Type, Price range, general photos, amenities
- Hidden/blurred: exact flat/house number, agent name, agent phone, shop address

**₹100 Unlock Pass:**
- Single-property unlock OR area unlock pass
- On payment: agent shop location (Google Maps), agent contact & shop name, and a QR/appointment code delivered instantly to customer's screen + WhatsApp
- Phone numbers are **never** shown raw — always via masked calling (Exotel/Twilio) until payment clears
- **Revenue split: 50% to the referring Agent's wallet, 50% to Company**, credited instantly on payment success

**In-person visit:**
- Agent verifies the customer via mobile number or QR code in their dashboard before revealing hidden flats/high-res photos
- If a customer walks in without having paid and registers on the spot (name + mobile + agent code), that agent's own listings rank first for that customer, then radius-based listings from other agents

### 3.4 Customer Gold Membership (₹500 one-time)

- Customer self-uploads: high-res photos, video tour, amenities, price expectation
- Goes to company moderation queue (anti-fake-listing check) before going live
- System auto-assigns a Master Property ID
- **Auto-injected into every active Prime Agent's CRM within a 1–5 km radius** — agents do zero manual searching, it just appears tagged "Direct Customer Listing"
- Any agent can still visit and upload their own better-quality photos on top of the same Master ID
- **Revenue split on the ₹500: 50% (₹250) instant credit to the referring agent's wallet**, withdrawable to bank or usable to pay their own Prime subscription
- If the listing came in through an agent's code, the agent's shop location shows on the map and the *agent's* mobile number is used, not the customer's; if the customer self-registered with no agent code, the *company's* number is shown and the location is the society's, not any specific agent's

### 3.5 Uber/Ola-Style Instant Agent Dispatch

Trigger: customer pays ₹100 → GPS lat/long captured → radius scan (1–5 km) for active Prime agents → **batched cascade**, not a mass blast:

```
[Customer Pays ₹100] → [GPS Radius Scan 1-5km]
        │
   [Batch 1: 5-10 nearest Prime agents, 1-min accept timer]
        │
   YES → Lead locked, chat/call opens, all other agents' notification disappears
   NO/TIMEOUT → cascades automatically to Batch 2 (next 5-10 agents)
```

- Round-robin / random selection within each batch (fairness — no single agent always gets first shot)
- First agent to hit "Accept" wins the lead; radar-style live UI on the customer's screen ("Finding nearby agents in 3 km…")
- On accept: agent's dashboard instantly unlocks customer's number, preferred location, budget; customer sees "Agent [Name — #AGT-102] accepted. Shop distance: 1.2 km"
- CRM auto-moves the lead: `Auto-Matched → In-Progress → Shop Visit Scheduled`

**Suggested stack (from client's own notes, technically sound):**
| Concern | Tech |
|---|---|
| Geofencing / radius filter | PostgreSQL + PostGIS, or Redis Geo for hot lookups |
| Real-time push/ring alert | Socket.io (WebSockets) + FCM (push) + Twilio (SMS/voice fallback) |
| Batch timeout/cascade queue | BullMQ on Redis |
| Payment → matching trigger | Razorpay webhook |

> ⚠️ Current DB is **MySQL via Prisma**, not Postgres. See §7 for how to reconcile this (MySQL spatial functions vs. adding a Postgres/PostGIS microservice vs. Redis Geo only).

### 3.6 B2B Agent-to-Agent Broadcast (no-typing dropdown)

For when an agent needs a flat *from* another agent's inventory (not from the customer-dispatch flow):

1. Agent fills a pure-dropdown form (no free text): Radius (1/3/5 km) → Society (auto-populated for that radius) → Flat size → Transaction type (Rent/Buy/Sell/Letout) → Budget range
2. Submit → push card alert to every active agent in that radius: *"📢 New Requirement: XYZ Society | 3BHK | Buy | ₹80L–1Cr"*
3. Any matching agent clicks **"I Have This Property"** → instant encrypted **Agent Code ↔ Agent Code chat** opens (e.g. `#AGT-101 ↔ #AGT-204`)
4. Agents privately negotiate commission-split %, visit time, and close the deal inside that chat

### 3.7 Calendar / Meeting Board / CRM — ✅ built

This module was never assigned a number in §7's phased roadmap (Phases 1–6 below skip
straight from dispatch/growth features to trust features without mentioning it) — built last,
once every numbered phase was done, closing the one remaining gap in this module inventory.

- Shared calendar slot booked between agent & customer for a site visit; both get reminders
- Full audit trail per property: visit date, inquiry date, follow-up due date
- **No-show handling:** if the agent doesn't show/respond on the scheduled visit, the customer can escalate to customer care, who broadcasts to 5–10 *new* nearby agents using the customer's existing unique booking code
- "Deal done today" agents' names run on a 24-hour live leaderboard ticker inside the app; company gift recipients also scroll on the same ticker — this half is Phase 6's `/leaderboard` ticker, already built there

**Implementation notes:**
- The "shared calendar slot" is a single confirmed datetime (`VisitAppointment.scheduledAt`),
  not a full free/busy calendar UI with competing slot proposals — §3.7 doesn't specify slot-
  negotiation mechanics, so this is the simplest reading that satisfies "booked... both get
  reminders."
- Reminders run on their own BullMQ delayed queue (`src/lib/queues/reminderQueue.ts`), same
  pattern as Phase 4's dispatch-cascade timeout queue, fired 1 hour before `scheduledAt`.
- No-show escalation reuses Phase 4's entire dispatch cascade engine (radius batching, Socket.io
  push, BullMQ timeout) via a new `createFreeDispatchForEscalation` — same mechanism as a paid
  ₹100 dispatch, just `amount: 0` (no new charge; the customer already paid once) and the
  no-show agent is permanently excluded from this particular re-match.
- **Found and fixed a real bug while building this:** `findNearbyAgents`'s Redis-Geo path
  (`src/lib/agentGeo.ts`) could return agent IDs that no longer exist in MySQL (index drift —
  an agent demoted or a stray key from a stopped process), which crashed the entire dispatch
  cascade with a foreign-key error the moment it tried to create a `DispatchNotification`
  against a nonexistent agent. Now cross-validated against live `AgentProfile` rows before
  being returned, silently dropping stale candidates instead of crashing.

### 3.8 Anti-Poaching / Duplicate-Visit Conflict Protection

This is one of the most concrete, well-specified modules in the PDF — treat it as a hard requirement, not a nice-to-have:

1. **Mandatory Mobile + OTP verification** before any agent logs a site visit for a customer
2. On OTP verify, the system immediately shows the *new* agent the customer's **entire cross-agent visit history** (which Master Property IDs, with which Agent Code, on what date)
3. If the new agent tries to open a Master Property ID the customer already viewed with a different agent:
   - Block flagged as a duplicate/conflict
   - **Automated real-time alert to the original agent** (push + WhatsApp): *"🚨 Conflict Alert: your customer Rohan (XXXX123) who viewed Flat #402 with you is now viewing it with #AGT-204"*
   - New agent's screen shows a warning banner naming the original agent and date
   - System permanently records **Primary Lead Ownership = original agent** — if that flat later sells/rents to that customer, commission rules favor the original agent regardless of who closed it

**Tech implementation matrix from client notes (sound, keep):**
| Component | Tech |
|---|---|
| Customer identification | Mobile + OTP |
| Visit logs | Immutable audit table: Customer ID + Property ID + Agent Code + timestamp |
| Conflict check | Redis cache + SQL query, sub-second lookup |
| Alerting | Socket.io + WhatsApp Business API |

### 3.9 Agent Rating, Switching & Warning System

- 5-star rating + written review after every visit/deal; high scorers get a "Top Rated Prime Agent" badge and search boost
- Customer can **split/switch agents** at will if unsatisfied — formal complaint goes straight to company
- **3-strike rule**: 3 verified complaints against one Agent Code → visible ranking drop + warning message to both agent and customer
- The agent a customer already left a formal complaint against must **never** be re-shown to that same customer again for a new lead in the same area
- New agent (post-switch) is drawn from the same 1–5 km radius, weighted toward agents who know that specific micro-area well
- **Abuse guardrails (explicit in the brief):** max 3 "switch/buzzer" actions per customer per day, 1–2 hour cooldown between uses, and a mandatory reason must be selected before the switch button is even clickable

### 3.10 Document Vault

- Per Master Property ID and per deal: Registry/Sale Deed, Agreement to Sell, Encumbrance Certificate, Layout Plans, Payment Receipts, signed agreement PDFs
- Access is code-scoped: visible only inside the relevant Agent Code / Investor Code dashboards, downloadable
- Customer↔Investor agreement records: customer name/contact, agreement date, lock-in period, flat/unit number, terms, signed copy upload

### 3.11 Investor Onboarding & Chain-of-Commission

```
Agent brings Investor → Investor fills Submission Form → Investor Code generated
                        → Investor Code permanently linked to the referring Agent Code
```

- Registration fee: **₹20,000/year**, 1-year validity, auto-renewal reminder + expiry alert surfaced on the Admin Panel
- Agent referral commission: **10% of the ₹20,000 fee = ₹2,000**, credited to the Agent Code wallet on payment
- If the investor later becomes an agent, they need a **separate, independent Agent Code** — commissions never blend across the two roles for the same person
- **Agent-to-agent referrals are a separate, parallel commission line — see §3.20.** Don't fold the two together: this section is Agent→Investor; §3.20 is Agent→Agent.

### 3.12 Property Deal Commission (direct brokerage)

Per deal, independent of the investor/company profit-share below:

| Party | Rate | On what | Amount (example) |
|---|---|---|---|
| Buyer's Agent (Agent A) | 1% | Property value | ₹1,00,000 |
| Seller's Agent (Agent B) | 1% | Property value | ₹1,00,000 |

> **Math note:** the client's example property value is written as ₹1,00,000,000, which numerically is ₹10 crore — but the 1% commission shown (₹1,00,000) is only correct for a ₹1,00,00,000 (**1 crore**) property. There's an extra zero in the source doc. Treat the canonical example as **property value = ₹1 crore**, and confirm this with the client before hardcoding any commission-calculator test cases.

### 3.13 Investor + Company Joint Deal Profit Distribution

Whenever a joint Investor+Company deal closes a profit (example base: ₹5,00,000):

| Share head | % | Amount | Where it's credited |
|---|---|---|---|
| Agent (investor-referral profit share) | 10% | ₹50,000 | Agent Code dashboard |
| Renovation / company expense | 10% | ₹50,000 | Company Admin Panel |
| Investor share | 50% of remaining 80% (=40%) | ₹2,00,000 | Investor Code ledger |
| Company share | 50% of remaining 80% (=40%) | ₹2,00,000 | Company Admin master ledger |
| **Total** | **100%** | **₹5,00,000** | Admin Master Summary |

*(This table is internally consistent in the source — 10 + 10 + 40 + 40 = 100 — no correction needed here, unlike §3.12.)*

**Full picture, per the client's worked example (Investor invests ₹10L, ₹5L deal profit realized):**
- Investor Code ledger shows: ₹2,00,000 profit credited
- Agent Code shows **two separate** line items for the same investor relationship:
  - ₹2,000 — 10% of the investor's ₹20,000 registration fee (one-time, §3.11)
  - ₹50,000 — 10% investor-referral profit share (recurring, per profitable deal cycle)
- These must **never be merged into a single "commission" number** in the UI — the Agent Portal spec (§3.14) explicitly lists them as 3 distinct line items.

### 3.14 Portals / Dashboards

**Investor Portal**
- Total active investment capital (e.g. ₹10L)
- Date-wise profit ledger: date, customer transaction, hold duration (days), credited profit
- Agreement & document vault access

**Agent Portal**
- Total earned commission, broken into exactly 3 categories (never merged):
  1. 10% Registration Referral (₹2,000/linked investor)
  2. 10% Deal Profit Share (₹50,000/profitable deal cycle)
  3. 1% Buyer/Seller Brokerage (₹1,00,000/deal side)
- Wallet balance (from ₹100/₹500 customer unlock splits too — see §3.3/§3.4)
- List of linked Investor Codes + live deal status
- Linked-agent chat, broadcast inbox, calendar/CRM board

**Admin Master Panel**
- Master hierarchy map: Agent Code → Investor Code → Customer/Property Unit
- **One-click Master Commission Calculator**: auto-computes and distributes every payout (agent/investor/company) for a deal in a single action
- TDS & company-handling-charge deduction engine, applied automatically before final wallet release
- Deal-wise + date-wise ledger, fully historical
- Renewal alert system for investor 1-year expiries
- Multi-mode payment tracker (Bank Transfer / Cheque / Cash / UPI / NetBanking) for both Investor→Company and Investor→Customer payment legs
- Live financial analytics: net profit, total investor returns, agent payouts, operating expenses
- Document vault management with code-level permissions
- Fast dispute resolution SLA: 2-hour audit turnaround target for commission conflicts / customer complaints (support desk requirement, not just software)

### 3.15 Geolocation & Mapping Architecture — ✅ built (amenity auto-tagging included)

- Frontend: Leaflet.js (lightweight) or Google Maps JS API
- Backend geo-indexing: Google Cloud (Maps API, Geocoding API, Places API)
- Nearby-amenity auto-tagging: given a flat's lat/long, auto-pull nearest Metro/Railway/Bus stand, Hospital, Grocery Market within 1/3/5 km — **agent never types this manually**
- Customer search = radius filter on lat/long

**Nearby-amenity auto-tagging — found missing and built in a later pass:**
`src/lib/amenityLookup.ts` — OpenStreetMap's Overpass API (free, no key, same posture as the
existing Nominatim geocoding), queried once at listing creation time for both agent and Gold
listings, nearest-per-category within 5km, stored on `AgentListing.nearbyAmenities` (distinct
from the pre-existing `amenities` field, which is on-property features like gym/pool — this is
*nearby places*). Best-effort: a slow/down Overpass instance returns `[]` rather than blocking
listing creation. **Bug found and fixed while building this:** the initial implementation
silently returned empty results because Overpass rejects requests without an `Accept` header
(bare 406) — easy to miss since the failure was swallowed by the same "don't block on this"
error handling that makes the feature safe to begin with. Fixed by adding `Accept`/`User-Agent`
headers, same identification requirement Nominatim already has.

### 3.16 Image Pipeline

- Client-side compression before upload (Compressor.js / Canvas API, e.g. 10MB → 1MB)
- Fixed resolution/aspect-ratio enforcement (e.g. 1280×720 or 1920×1080)
- Automatic company-logo watermark overlay
- **AI Vision duplicate/fraud shield** (stretch goal, flagged by client as future work): check if an uploaded photo was scraped from the internet, or already watermarked/listed by a different agent → zero duplicate/fake listings

### 3.17 Monetization Summary (all revenue streams in one place)

| Stream | Amount | Split |
|---|---|---|
| Agent Prime subscription | Monthly, auto-debit | 100% company |
| Investor registration | ₹20,000/year | 10% → referring agent, 90% company |
| Agent-to-agent referral (§3.20, new — basis unconfirmed, see §6) | 10% "from the new agent's code" | 10% → referring agent, rest → company |
| Investor+Company deal profit | Variable | 10% agent / 10% expense / 40% investor / 40% company |
| Buyer/Seller brokerage | 1% each side of deal value | 100% to respective agent (not split with company in the source doc) |
| Customer unlock pass | ₹100 | 50% referring agent / 50% company |
| Customer Gold self-list | ₹500 | 50% (₹250) referring agent / 50% company |
| Prime Booster Badge (top-of-search boost) | ₹1,499/month | 100% company (proposed upsell) |
| Deal token/escrow | ₹2,000 (example) | Held in escrow, not revenue — released on deal confirmation |

### 3.18 Gamification & Trust Features — ✅ built (direct call button included)

- "Agents of the Week" cards: photo, Agent Code, area, badge (Top Seller / Fastest Responder / 5-Star), direct call/WhatsApp button
- 24-hour scrolling ticker of same-day deal closers and company-gifted agents
- "King of Sector-74"-style area-dominance tags for consistently top-performing agents

**Direct call button — found missing and built in a later pass:** the leaderboard
(`src/app/leaderboard/page.tsx`) had the WhatsApp button on Agents of the Week cards but not
the "direct call" button the spec also asks for. Added a `tel:` link alongside the existing
WhatsApp link, same card, same phone number.

### 3.19 Risks the client explicitly flagged (worth designing around, not just noting)

- **Agent cartelization/boycott risk**: incumbent offline agent unions may resist the 3-warning system or switch-agent feature because it erodes their local dominance — plan a phased rollout per city/area rather than a hard nationwide cutover, and consider an agent-relations/onboarding-incentive track alongside the product launch.
- **Fake radius broadcasts / spam** — mitigated by daily-limit (3 switch actions/day) + cooldown (1–2 hrs) + mandatory reason, already specified in §3.9.

### 3.20 Agent-to-Agent Referral Commission (client update, 13 Aug 2026)

**Not yet built** — this is new, added after Phase 1 shipped. Raw client message (WhatsApp,
13 Aug 2026, translated from Hinglish): *"If one Agent gets another agent's code opened/
activated, they get a 10% referral/earning commission from the new agent's code."*

Read literally against how §3.11 (Agent→Investor referral) is structured, the equivalent
Agent→Agent rule is:

```
Agent A refers Agent B → Agent B registers + gets verified + activates Prime
                        → Agent B's Agent Code permanently linked to referring Agent A's Code
                        → Agent A gets 10% commission "from the new agent's code"
```

This mirrors §3.11's Agent→Investor pattern closely enough that it's probably meant to
reuse the same mechanism, one level up — but the client's phrasing ("10% commission ... se
earn") is ambiguous about the **basis** of that 10%, in a way that materially changes the
implementation (see §6 for the specific question to confirm before building this). Likely
candidates, cheapest-to-confirm first:
- 10% of Agent B's one-time Prime subscription payment (direct parallel to §3.11's "10% of
  the ₹20,000 investor fee") — a single, one-time referral credit.
- 10% of Agent B's *ongoing* earnings (every commission Agent B ever earns, forever) — an
  override commission, materially bigger and open-ended.
- 10% of Agent B's Prime subscription *specifically*, recurring every renewal (monthly/
  yearly, whatever Agent B's Prime cadence is) — recurring but capped to the subscription
  line only, not all of Agent B's other earnings.

Also needs: a `referringAgentId` field on `AgentProfile` (self-referential — the same
`AgentProfile → AgentProfile` shape §3.11 already uses for Investor→Agent), and a decision
on whether this becomes a 4th line item in the Agent Portal's commission breakdown or folds
into the existing `REGISTRATION_REFERRAL` `CommissionType` used for Investor referrals — see
§3.14's "exactly 3 categories, never merged" rule, which this would break as written if it's
kept as a visually separate line (worth it — don't silently merge "referred an Investor" and
"referred an Agent" into one number just because the ledger `CommissionType` enum name is the
same, per the same never-merge principle §3.14 already applies elsewhere).

---

## 4. Data Model — Additive Prisma Entities

These are **new** models/enums to add to `prisma/schema.prisma`, on top of what already exists (existing `User`/`Property`/`Project` etc. stay as-is; `Agent` and `Investor` extend `User` via role + a profile table rather than replacing it).

```prisma
enum Role {
  ADMIN
  SUBADMIN
  OWNER
  DEALER
  BUYER
  AGENT      // new
  INVESTOR   // new
}

model AgentProfile {
  id                String        @id @default(cuid())
  userId            String        @unique
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  agentCode         String        @unique          // AGT-DEL-1024
  shopName          String?
  shopAddress       String?       @db.Text
  shopLatitude      Float?
  shopLongitude     Float?
  yearsExperience   Int?
  staffCount        Int?
  reraNumber        String?
  tradeLicenseUrl   String?
  gstNumber         String?
  verified          Boolean       @default(false)
  primeStatus       Boolean       @default(false)   // active subscription gate
  walletBalance     Int           @default(0)       // paise or rupees, pick one convention
  ratingAvg         Float?        @default(0)
  warningCount      Int           @default(0)
  createdAt         DateTime      @default(now())

  investors         InvestorProfile[]
  listings          PropertyListing[]
  commissions       CommissionLedgerEntry[]
  sentBroadcasts    Broadcast[]
  visitLogs         PropertyVisitLog[]
  ratings           AgentRating[]
}

model InvestorProfile {
  id                String        @id @default(cuid())
  userId            String        @unique
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  investorCode      String        @unique
  referringAgentId  String
  referringAgent    AgentProfile  @relation(fields: [referringAgentId], references: [id])
  registrationFee   Int           @default(20000)
  registeredAt      DateTime      @default(now())
  expiresAt         DateTime                       // registeredAt + 1 year
  totalInvested     Int           @default(0)
  createdAt         DateTime      @default(now())

  ledgerEntries     InvestorLedgerEntry[]
}

model MasterProperty {
  id                String        @id @default(cuid())
  masterPropertyId  String        @unique           // PROP-DEL-2026-8891
  latitude          Float
  longitude         Float
  city              String
  society           String?
  flatNumber        String?                          // hidden until unlock
  listings          PropertyListing[]
  createdAt         DateTime      @default(now())
}

model PropertyListing {
  id                String        @id @default(cuid())
  masterPropertyId  String
  masterProperty    MasterProperty @relation(fields: [masterPropertyId], references: [id])
  agentId           String?                          // null = direct customer (Gold) listing
  agent             AgentProfile?  @relation(fields: [agentId], references: [id])
  source            ListingSource @default(AGENT)     // AGENT | CUSTOMER_GOLD
  images            String[]                          // or a child ListingImage table
  price             Int
  transactionType   TxnType                            // RENT | BUY | SELL | LETOUT
  createdAt         DateTime      @default(now())
}

enum ListingSource { AGENT CUSTOMER_GOLD }
enum TxnType       { RENT BUY SELL LETOUT }

model DealCommission {
  id                String        @id @default(cuid())
  dealValue         Int
  buyerAgentId      String?
  sellerAgentId     String?
  buyerCommission   Int?          // 1% of dealValue
  sellerCommission  Int?
  dealDate          DateTime      @default(now())
}

model ProfitDistribution {
  id                String        @id @default(cuid())
  investorId        String
  totalProfit       Int
  agentShare        Int           // 10%
  expenseShare      Int           // 10%
  investorShare     Int           // 40%
  companyShare      Int           // 40%
  distributedAt     DateTime      @default(now())
}

model CommissionLedgerEntry {
  id          String   @id @default(cuid())
  agentId     String
  agent       AgentProfile @relation(fields: [agentId], references: [id])
  type        CommissionType   // REGISTRATION_REFERRAL | DEAL_PROFIT_SHARE | BROKERAGE | UNLOCK_SPLIT | GOLD_SPLIT
  amount      Int
  refId       String?          // dealId / investorId / listingId
  createdAt   DateTime @default(now())
}
enum CommissionType { REGISTRATION_REFERRAL DEAL_PROFIT_SHARE BROKERAGE UNLOCK_SPLIT GOLD_SPLIT }

model InvestorLedgerEntry {
  id          String   @id @default(cuid())
  investorId  String
  investor    InvestorProfile @relation(fields: [investorId], references: [id])
  amount      Int
  dealRef     String?
  createdAt   DateTime @default(now())
}

model UnlockTransaction {
  id            String   @id @default(cuid())
  customerId    String
  masterPropertyId String
  amount        Int      @default(100)
  agentSplit    Int
  companySplit  Int
  paymentRef    String?
  createdAt     DateTime @default(now())
}

model PropertyVisitLog {
  id               String   @id @default(cuid())
  customerPhone    String
  masterPropertyId String
  agentId          String
  agent            AgentProfile @relation(fields: [agentId], references: [id])
  otpVerified      Boolean  @default(false)
  visitedAt        DateTime @default(now())
  isPrimaryOwner   Boolean  @default(true)   // false if this is a later, conflicting visit
}

model Broadcast {
  id          String   @id @default(cuid())
  agentId     String
  agent       AgentProfile @relation(fields: [agentId], references: [id])
  radiusKm    Int
  society     String?
  flatSize    String
  txnType     TxnType
  budgetMin   Int
  budgetMax   Int
  createdAt   DateTime @default(now())
}

model AgentChatMessage {
  id            String   @id @default(cuid())
  fromAgentId   String
  toAgentId     String
  broadcastId   String?
  message       String   @db.Text
  createdAt     DateTime @default(now())
}

model AgentRating {
  id          String   @id @default(cuid())
  agentId     String
  agent       AgentProfile @relation(fields: [agentId], references: [id])
  customerPhone String
  stars       Int
  comment     String?  @db.Text
  createdAt   DateTime @default(now())
}

model AgentWarning {
  id          String   @id @default(cuid())
  agentId     String
  reason      String
  createdAt   DateTime @default(now())
}

model DispatchRequest {
  id          String   @id @default(cuid())
  customerPhone String
  latitude    Float
  longitude   Float
  paymentRef  String
  status      DispatchStatus @default(SEARCHING)
  acceptedByAgentId String?
  createdAt   DateTime @default(now())
}
enum DispatchStatus { SEARCHING MATCHED EXPIRED CANCELLED }
```

> This is a starting schema, not final DDL — confirm currency convention (paise vs rupee ints), whether `String[]` (Mongo-style) is even valid under MySQL provider (it isn't — will need a child table for arrays under MySQL/Prisma), and whether Master Property lat/long needs PostGIS-grade spatial indexing or Redis Geo is sufficient at launch scale.

---

## 5. Tech Stack Reconciliation

The client's own technical notes (scattered through the PDF) assume Postgres+PostGIS, MongoDB, and Redis — but this repo is **Next.js + Prisma + MySQL**. Recommended reconciliation:

| Need | Client's suggestion | Fits current stack? | Status |
|---|---|---|---|
| Radius/geofence search | PostGIS | ❌ (MySQL) | ✅ Built — MySQL stays source of truth (`AgentProfile.shopLatitude/Longitude`); no PostGIS added. |
| Hot-path radius lookups for dispatch | Redis Geo | ✅ | ✅ Built — `src/lib/agentGeo.ts`, `GEOADD`/`GEOSEARCH ... BYRADIUS`, with an automatic MySQL+haversine fallback when Redis isn't configured. |
| Real-time chat/alerts | Socket.io | ✅ | ✅ Built — `server.js` now creates the Socket.io server (see the "Verify" note below, now answered); `src/lib/socket.ts` server-side, `src/lib/socketClient.ts` browser-side. |
| Push notifications | FCM + Twilio | ✅ | ❌ Not built — needs new Firebase/Twilio accounts and, for FCM specifically, a mobile/PWA target this app doesn't have yet. In-app Socket.io push + the existing WhatsApp/email `notifyUser` fallback cover the same "alert the agent" outcome for now. |
| Batch/timeout queue (cascade dispatch, broadcast expiry) | BullMQ | ✅ | ✅ Built — `src/lib/queues/dispatchQueue.ts`, worker started once via `src/instrumentation.ts`. Broadcasts don't need a timeout queue (they're a one-shot push, not a cascade), so only dispatch uses this. |
| Payments | Razorpay | ✅ | ✅ Built (Phase 3) for the ₹100 unlock/dispatch charge; investor fee and Prime subscription still admin-confirmed. |
| Masked calling | Exotel / Twilio | ✅ | ❌ Not built — still simulated (agent's real phone number is shown directly once unlocked/matched, not proxied). |
| Document/photo storage | — | ✅ | ✅ Already built — `src/app/api/upload`. |
| AI photo-duplicate detection | Computer Vision | Stretch | Backlog, not attempted. |

**Verify — now answered:** `server.js` was a plain Next.js standalone launcher before Phase 4; it's now the actual Socket.io server too (see Phase 4 above). Real-time dispatch/broadcast/chat only work when the app is launched through `server.js` (`npm run dev` or `npm run start:server`), not plain `next dev`/`next start` — the latter don't expose the raw HTTP server Socket.io needs to attach to. `npm run dev:turbo` still exists as a fast-refresh-only fallback for UI work that doesn't touch real-time features.

---

## 6. Contradictions / Ambiguities to Resolve With the Client Before Building

1. **Property value typo (§3.12):** example says ₹1,00,000,000 (10 Cr) but commission math implies ₹1,00,00,000 (1 Cr). Confirm which figure is canonical.
2. **Two different "₹100" flows aren't clearly unified — interim decision shipped in Phase 4, still not actually confirmed by the client:**
   - §3.3: ₹100 to unlock a single property or an area pass
   - §3.13 (Customer Workflow section): ₹100 registration fee giving **30-day validity**
   - §3.5: ₹100 fee that triggers the Uber-style GPS dispatch search
   Is this **one** ₹100 purchase that (a) verifies the customer via OTP, (b) is valid 30 days, and (c) both unlocks contact info AND lets them run unlimited dispatch searches in that window? Or are these 2–3 separate paid actions? **Built as:** dispatch (`DispatchRequest`) reuses the exact same ₹100/50-50-split shape as the listing unlock pass — chosen because §3.17's monetization table lists only one "customer unlock pass" revenue line, not a separate dispatch fee, so treating them as two unrelated charges would contradict the doc's own summary table. This is *not* the same as (a)/(b)/(c) above — there's still no 30-day validity window or "pay once, unlock this listing AND get unlimited dispatch searches" behavior; each dispatch request is its own ₹100 charge, same as each listing unlock is its own ₹100 charge. Confirm with the client before assuming this is final.
3. ~~**Brokerage split ambiguity:**~~ **Resolved (Phase 3 build):** confirmed 100% to the agent, no company cut on direct brokerage — the "10% renovation/company expense" line in §3.13 applies only to investor+company joint deal profit, not brokerage. Implemented in `computeBrokerage` (`src/lib/commission.ts`).
4. **Escrow/token system** (₹2,000 example) is mentioned once in "Special Notes" with no full workflow (who triggers release, what happens on deal cancellation, refund rules) — needs its own mini-spec before building.
5. **AI Vision fraud detection and Auto-Matching (top-3-society AI recommender)** are listed under "Special Notes" as aspirational, not specified in workflow detail — treat as backlog, not MVP.
6. ~~**Agent-to-agent referral commission basis (§3.20)**~~ **Resolved:** one-time, 10% of the referred agent's first Prime subscription payment — the direct parallel to §3.11's investor referral, not the open-ended "everything Agent B ever earns" reading. Implemented in `activateAgentPrime` (`src/lib/agent.ts`).
7. **Customer-facing Buy/Rent-only rule (§3.3, new 13 Aug 2026) vs. §3.6's B2B Sell/Letout types:** confirmed these coexist (§3.6 is agent-facing, not customer-facing) — but confirm with the client that Sell/Letout should still exist at all as *agent inventory* categories once §3.6 gets built, rather than the "Buy or Rent only" rule meaning to retire Sell/Letout everywhere.

---

## 7. Suggested Build Phases

Building all of this at once is not realistic — recommend phased delivery, each phase shippable and demoable on its own:

**Phase 1 — Foundation (Agent + Investor identity, no automation)** ✅ built
- Agent registration (2-phase form + verification), Agent Code generation
- Investor registration linked to Agent Code, 1-year expiry tracking
- Basic commission ledger tables + manual/admin-triggered payout entries (no auto-calculator yet)
- Admin panel: agent/investor list, verification queue, mapping directory
- **Addendum §3.20 (Agent-to-agent referral commission) — ✅ built (shipped alongside Phase 3).**
  Client confirmed the basis (§6 item 6): 10% of the referred agent's first Prime subscription
  payment, credited once. Same shape as the Investor referral above, one level up — a
  `referringAgentId` self-relation on `AgentProfile`, credited in `activateAgentPrime` only on
  an agent's *first* Prime activation (never on renewals), as its own `AGENT_REFERRAL`
  `CommissionType` line (not merged into `REGISTRATION_REFERRAL`, per §3.14's never-merge rule).

**Phase 2 — Listings + Deduplication** ✅ built
- Master Property ID engine, multi-agent co-listing
- Teaser (free) view + ₹100 pay-to-unlock flow with 50/50 wallet split
- Image compression/watermark pipeline
- Customer-facing views are Buy/Rent only (§3.3 addendum) — already how this phase was built

**Phase 3 — Money Automation** ✅ built
- One-click Master Commission Calculator (brokerage + investor deal profit split) + TDS engine
- Full Agent/Investor/Admin dashboards, including a new self-service Investor Portal
- Payment-mode tracker (multi-mode ledger) on deals, profit distributions, payouts, and the
  investor registration fee
- Master hierarchy map (Agent → Investor → deal cycle) and live financial analytics
  (net profit, investor returns, agent payouts, operating expenses)
- REST API mirrors for every Phase 3 Server Action (deals, payouts, investor portal, capital
  updates, analytics) — Phase 1/2's mobile-app-parity convention, closed out for Phase 3 too
- Real Razorpay integration wired in (order creation + signature verification) for the ₹100
  unlock pass — falls back to the existing simulated/admin-confirmed flow until
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set
- **Agent-to-agent referral commission (§3.20) — ✅ built**, see the Phase 1 addendum above

**Phase 4 — Geolocation & Dispatch** ✅ built
- Radius search via Redis Geo (`GEOADD`/`GEOSEARCH`), with an automatic MySQL+haversine
  fallback (same pattern Phase 2's dedup search already used) when Redis is unavailable
- Uber-style cascade dispatch: real Socket.io (live push) + BullMQ (batch/timeout queue) +
  Redis — the client's own suggested stack, not a polling shortcut (explicitly requested)
- B2B dropdown broadcast (radius → society → flat size → transaction type → budget, zero free
  text) + live Agent Code ↔ Agent Code chat, scoped per broadcast per agent pair
- **Fixed a pre-existing gap while building this:** `AgentProfile.shopLatitude/shopLongitude`
  were defined in the schema since Phase 1 but never actually geocoded anywhere — no agent had
  real coordinates, which silently would have broken any radius feature. Agent registration
  now geocodes the shop address (same Nominatim helper City/Locality/Project already use).
- **Real-time requires the custom server.** `npm run dev`/`npm run start:server` (both run
  `server.js`) have Socket.io; plain `next dev`/`next start` do not — see §5.

**Phase 5 — Trust & Retention** ✅ built
- OTP-gated visit logging + anti-poaching conflict detection/alerts (§3.8) — reuses the same
  OTP primitives as buyer/investor login and the Socket.io infra from Phase 4 for the real-time
  alert to the original agent, exactly as the client's own tech matrix specifies
- 5-star ratings with a rolling average + "Top Rated" badge, 3-strike warning system,
  switch-agent flow with the exact abuse guardrails specified (max 3/day, cooldown, mandatory
  reason) — §3.9
- Document vault, code-scoped to Agent Code / Investor Code dashboards, plus the named
  Customer↔Investor agreement record type — §3.10
- **Implementation calls made where §3.9 didn't specify exact numbers:** "Top Rated" badge
  threshold (4.5★ average, 5+ ratings minimum) and "weighted toward agents who know the
  micro-area" (agents with existing listings in the area are ranked first among replacement
  candidates) — both documented in `src/lib/rating.ts` / `src/lib/agentSwitch.ts`, neither
  blocks anything if the client wants different numbers later.

**Phase 6 — Growth Layer** ✅ built (except the two explicitly-deferred AI items)
- Gold Membership self-listing (§3.4): ₹500 one-time (same real-payment path as the ₹100
  unlock/dispatch charges), company moderation queue before going live, auto-assigned Master
  Property ID, auto-injected into every nearby Prime agent's CRM within 5km on approval
  (Redis Geo push, same mechanism Phase 4's dispatch/broadcast use). 50% (₹250) instant
  referral credit to the agent whose code was used — credited on payment, independent of the
  moderation outcome; 0% if no agent code was given, in which case the listing shows the
  company's contact instead of any agent's once unlocked.
- **Required extending `AgentListing`** (built in Phase 2): `agentId` is now nullable — a Gold
  listing with no referring agent genuinely has no agent — plus a `source`
  (`AGENT`/`CUSTOMER_GOLD`) and `approvalStatus` field. Agent-created listings are unaffected
  (still default `APPROVED`, still require `agentId`); every place that read `listing.agent`
  assuming it always exists (`src/lib/unlock.ts`, the listing detail page/API) was updated to
  handle the null case.
- Gamification (§3.18): Agents of the Week (Top Seller / Fastest Responder / 5-Star, each
  computed live from real activity — commission earned, dispatch-accept latency, rating
  average — not curated), a same-day deal ticker, and "King of Sector-74"-style area-dominance
  tags (most active listings in a locality, recomputed live rather than a stored one-time
  title). No Prime Booster Badge upsell purchase flow was built — the roadmap only names it as
  a "proposed upsell" in §3.17's monetization table, not a specified feature.
- **Deliberately not built — AI photo-fraud shield (§3.16) and AI auto-matching recommender:**
  the client's own doc explicitly flags both as "Special Notes... not specified in workflow
  detail — treat as backlog, not MVP" (§6 item 5) and "Stretch... not MVP-blocking" (§5's tech
  table). Building either now would mean inventing the workflow, not implementing the client's
  spec — exactly the kind of unrequested judgment call this build has avoided everywhere else.

---

## 8. Open Questions for the Client

- Confirm the two math points in §6 (property value zero, ₹100 flow unification) before any commission-calculator code is written — wrong-by-10x bugs here are expensive to unwind once live money is flowing.
- Is MySQL (current DB) acceptable long-term, or should the team budget for a Postgres+PostGIS migration once dispatch/radius search is the primary product surface?
- ~~Who owns TDS compliance logic~~ **Interim answer shipped in Phase 3:** TDS is a flat, admin-editable percentage (default 5%, `SiteSettings.tdsPercent`) deducted at agent payout time — a placeholder until finance/CA confirms the real Section 194H rate and whether it should vary by payout type. Don't treat 5% as authoritative.
- Escrow/token flow (§6.4) — is there a payment-gateway escrow product already chosen (Razorpay Route, RazorpayX, etc.) or does "escrow" mean the company's own bank account only? Still open. Note: real Razorpay *order/payment* integration (not escrow) is now wired for the ₹100 unlock pass — see `src/lib/razorpay.ts` — but only goes live once `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are added to `.env`.
- ~~**Agent-to-agent referral commission basis**~~ **Resolved** — see §6 item 6.
