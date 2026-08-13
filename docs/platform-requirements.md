# Agent + Investor + Commission Super-Platform — Consolidated Requirements

Source documents:
- `Hindlenglish Agent And Investor Commission.pdf` (5 pages) — commission/investor logic
- `Agent Registration & Submission Form.pdf` (17 pages) — agent onboarding, listings, dispatch, chat, anti-poaching, gamification

This file consolidates both (messy, Hinglish, repetitive) client documents into one build-ready spec: what exists today, what needs to be built, the exact business rules, the data model, the tech stack, and a phased roadmap. Nothing here is implemented yet — this is the planning artifact the client asked for.

---

## 1. Current State of the Codebase (baseline)

`prisma/schema.prisma` today only supports a classic listings marketplace:

- `User` with `Role`: `ADMIN, SUBADMIN, OWNER, DEALER, BUYER` — **no `AGENT` or `INVESTOR` role**
- `Property`, `Project`, `Developer`, `City`/`Locality` — flat listings, no geo lat/long on `Property` itself (only City/Locality have lat/long), no dedup, no Master Property ID
- `Plan` / `Subscription` — generic subscription plans, not tied to agent commission or prime status
- `Enquiry`, `LeadView`, `SavedProperty` — simple lead capture, no pay-to-unlock, no OTP-gated visit logging
- No wallet/ledger, no commission tables, no chat, no geofencing, no dispatch queue, no ratings, no document vault

**Conclusion:** everything in Sections 3–9 below is net-new. The existing marketplace (properties, projects, developers, cities) can stay as the "catalog" layer; the new system plugs in as Agent/Investor/Commission/Dispatch layers on top.

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

### 3.1 Agent Registration & Verification (2-phase)

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

### 3.2 Property Listing & Global Deduplication Engine

- **Master Property ID** (`PROP-DEL-2026-8891`): one ID per physical flat, forever
- **Multi-Agent Mapping**: many agents can attach themselves to the same Master Property ID (co-listing); each agent's own photos/description show under their own code
- Backend runs a duplication check (address/geofence match) on every new upload before minting a new Master ID vs. attaching to an existing one
- Prime agents get a **daily digest**: "today, in a 1–10 km radius, X new listings were added, in these societies, these configs (2BHK/3BHK)"
- Location is always **agent shop location**, not the flat's exact address, until the customer pays to unlock

### 3.3 Customer Discovery — Teaser → Pay-to-Unlock

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

### 3.7 Calendar / Meeting Board / CRM

- Shared calendar slot booked between agent & customer for a site visit; both get reminders
- Full audit trail per property: visit date, inquiry date, follow-up due date
- **No-show handling:** if the agent doesn't show/respond on the scheduled visit, the customer can escalate to customer care, who broadcasts to 5–10 *new* nearby agents using the customer's existing unique booking code
- "Deal done today" agents' names run on a 24-hour live leaderboard ticker inside the app; company gift recipients also scroll on the same ticker

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

### 3.15 Geolocation & Mapping Architecture

- Frontend: Leaflet.js (lightweight) or Google Maps JS API
- Backend geo-indexing: Google Cloud (Maps API, Geocoding API, Places API)
- Nearby-amenity auto-tagging: given a flat's lat/long, auto-pull nearest Metro/Railway/Bus stand, Hospital, Grocery Market within 1/3/5 km — **agent never types this manually**
- Customer search = radius filter on lat/long

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
| Investor+Company deal profit | Variable | 10% agent / 10% expense / 40% investor / 40% company |
| Buyer/Seller brokerage | 1% each side of deal value | 100% to respective agent (not split with company in the source doc) |
| Customer unlock pass | ₹100 | 50% referring agent / 50% company |
| Customer Gold self-list | ₹500 | 50% (₹250) referring agent / 50% company |
| Prime Booster Badge (top-of-search boost) | ₹1,499/month | 100% company (proposed upsell) |
| Deal token/escrow | ₹2,000 (example) | Held in escrow, not revenue — released on deal confirmation |

### 3.18 Gamification & Trust Features

- "Agents of the Week" cards: photo, Agent Code, area, badge (Top Seller / Fastest Responder / 5-Star), direct call/WhatsApp button
- 24-hour scrolling ticker of same-day deal closers and company-gifted agents
- "King of Sector-74"-style area-dominance tags for consistently top-performing agents

### 3.19 Risks the client explicitly flagged (worth designing around, not just noting)

- **Agent cartelization/boycott risk**: incumbent offline agent unions may resist the 3-warning system or switch-agent feature because it erodes their local dominance — plan a phased rollout per city/area rather than a hard nationwide cutover, and consider an agent-relations/onboarding-incentive track alongside the product launch.
- **Fake radius broadcasts / spam** — mitigated by daily-limit (3 switch actions/day) + cooldown (1–2 hrs) + mandatory reason, already specified in §3.9.

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

| Need | Client's suggestion | Fits current stack? | Recommendation |
|---|---|---|---|
| Radius/geofence search | PostGIS | ❌ (MySQL) | MySQL 8+ has native `ST_Distance_Sphere` / spatial indexes — sufficient for 1–5km radius queries at moderate scale. Avoid adding a second database unless query volume proves it's needed. |
| Hot-path radius lookups for dispatch | Redis Geo | ✅ optional add-on | Add Redis purely as a cache/queue (also needed for BullMQ below) — use `GEOADD`/`GEORADIUS` for the sub-second cascade-dispatch lookups, keep MySQL as source of truth. |
| Real-time chat/alerts | Socket.io | ✅ | Fine on Next.js custom server (there's already a `server.js` in the repo — good sign this may already be a custom Node server, worth confirming). |
| Push notifications | FCM + Twilio | ✅ | Standard integration, no conflict. |
| Batch/timeout queue (cascade dispatch, broadcast expiry) | BullMQ | ✅ | Requires Redis — same instance as above. |
| Payments | Razorpay | ✅ | Standard. |
| Masked calling | Exotel / Twilio | ✅ | Standard. |
| Document/photo storage | — | ✅ | Repo already has `src/app/api/upload` — extend existing pattern. |
| AI photo-duplicate detection | Computer Vision | Stretch | Treat as Phase 3+, not MVP-blocking. |

**Verify:** confirm whether `server.js` at repo root is already a custom Node/Socket.io server or a plain Next.js standalone launcher — this determines whether real-time chat/dispatch can be added in-process or needs a separate service.

---

## 6. Contradictions / Ambiguities to Resolve With the Client Before Building

1. **Property value typo (§3.12):** example says ₹1,00,000,000 (10 Cr) but commission math implies ₹1,00,00,000 (1 Cr). Confirm which figure is canonical.
2. **Two different "₹100" flows aren't clearly unified:**
   - §3.3: ₹100 to unlock a single property or an area pass
   - §3.13 (Customer Workflow section): ₹100 registration fee giving **30-day validity**
   - §3.5: ₹100 fee that triggers the Uber-style GPS dispatch search
   Is this **one** ₹100 purchase that (a) verifies the customer via OTP, (b) is valid 30 days, and (c) both unlocks contact info AND lets them run unlimited dispatch searches in that window? Or are these 2–3 separate paid actions? This materially changes the payments/ledger schema (§4 `UnlockTransaction` vs `DispatchRequest` currently modeled as separate paid events).
3. **Brokerage split ambiguity:** the 1% buyer/seller brokerage (§3.12) is shown going 100% to the agent, while every other revenue line (registration, unlock, gold, profit-share) has an explicit company cut. Confirm the company genuinely takes 0% of direct brokerage, or whether the "10% renovation/company expense" line in §3.13's profit table is meant to apply here too.
4. **Escrow/token system** (₹2,000 example) is mentioned once in "Special Notes" with no full workflow (who triggers release, what happens on deal cancellation, refund rules) — needs its own mini-spec before building.
5. **AI Vision fraud detection and Auto-Matching (top-3-society AI recommender)** are listed under "Special Notes" as aspirational, not specified in workflow detail — treat as backlog, not MVP.

---

## 7. Suggested Build Phases

Building all of this at once is not realistic — recommend phased delivery, each phase shippable and demoable on its own:

**Phase 1 — Foundation (Agent + Investor identity, no automation)**
- Agent registration (2-phase form + verification), Agent Code generation
- Investor registration linked to Agent Code, 1-year expiry tracking
- Basic commission ledger tables + manual/admin-triggered payout entries (no auto-calculator yet)
- Admin panel: agent/investor list, verification queue, mapping directory

**Phase 2 — Listings + Deduplication**
- Master Property ID engine, multi-agent co-listing
- Teaser (free) view + ₹100 pay-to-unlock flow with 50/50 wallet split
- Image compression/watermark pipeline

**Phase 3 — Money Automation**
- One-click Master Commission Calculator + TDS engine
- Full Agent/Investor/Admin dashboards with the 3-category commission breakdown
- Payment-mode tracker (multi-mode ledger)

**Phase 4 — Geolocation & Dispatch**
- Radius search (MySQL spatial or Redis Geo)
- Uber-style cascade dispatch with batch/timeout queue
- B2B dropdown broadcast + Agent Code-to-Code chat

**Phase 5 — Trust & Retention**
- OTP-gated visit logging + anti-poaching conflict detection/alerts
- Ratings, 3-warning system, switch-agent flow with abuse limits
- Document vault

**Phase 6 — Growth Layer**
- Gold Membership self-listing + auto-injection to nearby prime agents
- Gamification (leaderboard, Agent of the Week, Prime Booster Badge upsell)
- AI photo-fraud shield, AI auto-matching recommender

---

## 8. Open Questions for the Client

- Confirm the two math points in §6 (property value zero, ₹100 flow unification) before any commission-calculator code is written — wrong-by-10x bugs here are expensive to unwind once live money is flowing.
- Is MySQL (current DB) acceptable long-term, or should the team budget for a Postgres+PostGIS migration once dispatch/radius search is the primary product surface?
- Who owns TDS compliance logic (finance/CA input needed, not just engineering assumption)?
- Escrow/token flow (§6.4) — is there a payment-gateway escrow product already chosen (Razorpay Route, RazorpayX, etc.) or does "escrow" mean the company's own bank account only?
