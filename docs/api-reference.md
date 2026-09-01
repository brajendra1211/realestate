# BayaEstate Master API Reference (Unified Panel-by-Panel)

Comprehensive, production-grade documentation for all API routes in BayaEstate, strictly organized by **User Panel / Role**:
1. [Admin Panel APIs](#1-admin-panel-apis)
2. [Agent Panel APIs](#2-agent-panel-apis)
3. [Buyer / Customer Panel APIs](#3-buyer--customer-panel-apis)
4. [Investor Panel APIs](#4-investor-panel-apis)
5. [Public & Shared Services APIs](#5-public--shared-services-apis)

---

## Authentication & Headers

- **Session Authentication**: All protected endpoints rely on standard NextAuth session cookies obtained via `/api/auth/[...nextauth]` or login routes (`/login`, `/buyer/login`, `/investor/login`).
- **Response Format**:
  - **Success (200 / 201)**: Returns JSON payload directly.
  - **Error (4xx / 5xx)**: Returns `{ "error": "errorCodeOrMessage" }`.

---

# 1. Admin Panel APIs

Access restricted to users with `role: "ADMIN"`.

### 1.1 Agent Verification & Tier Management
#### `GET /api/admin/agents`
- **Purpose**: List all registered agents with application status (`PENDING`, `APPROVED`, `REJECTED`), plan tier, and compliance documents.
- **Query Params**: `status?` (`PENDING` | `APPROVED` | `REJECTED`), `page?`, `limit?`
- **Response**: `AgentProfile[]`

#### `POST /api/admin/agents/[id]/approve`
- **Purpose**: Approve agent application, generate unique `agentCode` (e.g. `AGT-1024`), enable dashboard access, and notify agent via SMS/email.
- **Response**: Updated `AgentProfile`

#### `POST /api/admin/agents/[id]/reject`
- **Purpose**: Reject agent application with mandatory audit reason.
- **Request Body**: `{ "reason": "string" }`
- **Response**: Updated `AgentProfile`

#### `POST /api/admin/agents/[id]/activate-prime`
- **Purpose**: Admin manual activation or renewal of agent's Prime Plan tier (30 days validity).
- **Response**: `{ "success": true, "primeUntil": "ISO Date" }`

---

### 1.2 Customer Direct Gold Listing Moderation (Anti-Fake Pipeline)
#### `GET /api/admin/gold-listings`
- **Purpose**: Fetch customer self-uploaded Gold listings awaiting anti-fake moderation (`approvalStatus: "PENDING"`).
- **Response**: `(AgentListing & { masterProperty: MasterProperty, goldPurchase: GoldListingPurchase })[]`

#### `POST /api/admin/gold-listings/[id]/approve`
- **Purpose**: Approve Gold listing after address/price verification:
  1. Sets `approvalStatus: "APPROVED"`.
  2. Activates 90-day listing validity countdown (`listingExpiresAt = now + 90 days`).
  3. Sets 6-month agreement countdown (`agreementExpiryDate = now + 180 days`).
  4. Listing goes LIVE on public search feed.
  5. Auto-injects into the CRM feed of top 5 nearest Prime agents within 5km radius.
  6. Dispatches notification to property owner.
- **Response**: Updated `AgentListing`

#### `POST /api/admin/gold-listings/[id]/reject`
- **Purpose**: Reject fraudulent or duplicate listing with explanation.
- **Request Body**: `{ "reason": "string" }`
- **Response**: Updated `AgentListing`

---

### 1.3 B2B Deals & Platform Commission Profit Distribution
#### `GET /api/admin/deals`
- **Purpose**: List all inter-agent B2B deals across the platform.
- **Query Params**: `status?` (`ACTIVE`, `TOKEN_RECEIVED`, `AGREEMENT_DONE`, `REGISTRY_COMPLETED`, `CLOSED`)
- **Response**: `Deal[]`

#### `POST /api/admin/deals/profit-distribution`
- **Purpose**: Trigger platform-wide deal commission reconciliation. Ensures 10% platform share deduction and 45%-45% split to Buyer/Seller agents for completed deals.
- **Response**: `{ "processedCount": number, "totalPlatformFee": number }`

---

### 1.4 Agent Wallet Payout Approvals
#### `GET /api/admin/payouts`
- **Purpose**: List agent wallet withdrawal requests.
- **Query Params**: `status?` (`REQUESTED`, `PROCESSING`, `PROCESSED`, `REJECTED`)
- **Response**: `PayoutRequest[]`

#### `POST /api/admin/payouts/[id]/process`
- **Purpose**: Mark payout processed after NEFT/IMPS bank transfer with reference ID.
- **Request Body**: `{ "referenceNumber": "string" }`
- **Response**: Updated `PayoutRequest`

#### `POST /api/admin/payouts/[id]/reject`
- **Purpose**: Reject withdrawal request with reason; refunds amount back to agent wallet.
- **Request Body**: `{ "reason": "string" }`
- **Response**: Updated `PayoutRequest`

---

### 1.5 Investor Capital & Yield Management
#### `GET /api/admin/investors`
- **Purpose**: List all registered real estate investors, deposited capital, and total returns paid.
- **Response**: `InvestorProfile[]`

#### `POST /api/admin/investors/[id]/capital`
- **Purpose**: Record new capital deposit or capital return for an investor.
- **Request Body**: `{ "amount": number, "type": "DEPOSIT" | "RETURN", "note": "string" }`
- **Response**: `InvestorLedgerEntry`

#### `POST /api/admin/investors/[id]/confirm-payment`
- **Purpose**: Verify bank wire / RTGS proof for investor commitment.
- **Request Body**: `{ "referenceId": "string" }`
- **Response**: `{ "success": true }`

---

### 1.6 Platform Analytics & Geographic Hierarchy
#### `GET /api/admin/analytics`
- **Purpose**: System-wide performance KPIs: total GMV, unlock revenues, prime membership fees, deals closed, verified visits count, anti-bypass agreement count.
- **Response**: Comprehensive analytics object.

#### `POST /api/admin/geo/states`
- **Purpose**: Add or edit an Indian state in the geographic master database.
- **Request Body**: `{ "name": "string", "code": "string" }`
- **Response**: `State`

#### `POST /api/admin/geo/cities`
- **Purpose**: Add or edit a city under a state with coordinates.
- **Request Body**: `{ "name": "string", "stateId": "string", "latitude": number, "longitude": number }`
- **Response**: `City`

---

# 2. Agent Panel APIs

Access restricted to users with `role: "AGENT"`.

### 2.1 Agent Registration & Profile
#### `POST /api/agent/register`
- **Auth**: Public
- **Purpose**: Self-register as a broker/agent with shop location, RERA ID, GSTIN, and compliance documents.
- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "password": "string",
    "shopName": "string",
    "shopAddress": "string",
    "city": "string",
    "latitude": 28.535,
    "longitude": 77.391,
    "reraNumber": "string?",
    "gstNumber": "string?",
    "referredByAgentCode": "string?"
  }
  ```
- **Response (201)**: `{ "agentId": "string", "status": "PENDING" }`

#### `GET /api/agent/me`
- **Purpose**: Logged-in agent profile details, plan tier, agent code, wallet balance, ratings.
- **Response**: `AgentProfile`

#### `GET /api/agent/ratings`
- **Purpose**: Get customer reviews, average star rating, and feedback history.
- **Response**: `{ "ratingAvg": 4.8, "ratingCount": 24, "reviews": [...] }`

#### `GET /api/agent/documents`
- **Purpose**: Fetch uploaded verification certificates (RERA, Trade License).
- **Response**: `AgentDocument[]`

---

### 2.2 Membership Subscription & Auto-Pay Mandate Engine
#### `GET /api/agent/subscription/plans`
- **Auth**: Public or Agent
- **Purpose**: Fetch available membership plans:
  - **Basic Plan**: ₹1,000 / month, 30 days validity, ₹500 referral split to referring agent wallet.
  - **Prime Plan**: ₹2,000 / month, 30 days validity, ₹1,000 referral split to referring agent wallet.
- **Response**: `AgentPlan[]`

#### `GET /api/agent/subscription/status`
- **Purpose**: Active plan status, days left until renewal, wallet auto-debit eligibility, 5-day pre-expiry warning flag, and visibility pushback penalty flag.
- **Response**:
  ```json
  {
    "planTier": "PRIME",
    "active": true,
    "daysRemaining": 14,
    "renewalAlertActive": false,
    "hasAutoPayMandate": true,
    "walletBalance": 4500,
    "visibilityDeprioritized": false
  }
  ```

#### `POST /api/agent/subscription/autopay-mandate`
- **Purpose**: Save linked UPI VPA (e.g. `agent@okaxis`) as automated backup mandate when wallet balance is insufficient on renewal day.
- **Request Body**: `{ "vpa": "agent@upi" }`
- **Response**: `{ "success": true, "autoPayMandate": "agent@upi" }`

---

### 2.3 60-Day Review Cycle & 20% Discount Coupons
#### `GET /api/agent/cycle`
- **Purpose**: Get agent's active 60-day performance review cycle metrics:
  - Target: 5 Listings, 1 Deal, 3 Site Visits.
  - Current progress and days remaining.
  - Carry-forward score points (+100 for meeting targets).
  - Active 20% renewal discount coupon (if within 48h of expiry).
- **Response**:
  ```json
  {
    "cycleStartDate": "ISO Date",
    "cycleEndDate": "ISO Date",
    "daysRemaining": 38,
    "planTier": "PRIME",
    "targets": { "listings": 5, "deals": 1, "visits": 3 },
    "achieved": { "listings": 3, "deals": 1, "visits": 2 },
    "isTargetMet": true,
    "carryForwardScore": 100,
    "coupon": { "code": "RENEW20-AG101-ABCD", "discountPercent": 20, "expiresAt": "ISO Date" }
  }
  ```

#### `POST /api/agent/cycle/coupon`
- **Purpose**: Claim or activate 20% Pre-Expiry Discount Coupon when listings or membership enter the 48-hour window.
- **Response**: `{ "code": "RENEW20-AG101-ABCD", "discountPercent": 20, "expiresAt": "ISO Date" }`

---

### 2.4 Property Listings, Auto-Delisting & Renewals
#### `GET /api/agent/listings`
- **Purpose**: List all properties managed by this agent with validity days left, agreement urgency badges, and delist status.
- **Response**: `AgentListing[]`

#### `POST /api/agent/listings`
- **Purpose**: Create a new property listing under Basic (₹200 / 30d) or Gold (₹500 / 90d) plan.
- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "listingType": "SALE" | "RENT",
    "propertyType": "APARTMENT" | "VILLA" | "PLOT" | "COMMERCIAL",
    "price": 7500000,
    "listingPlan": "BASIC" | "GOLD",
    "exactAddress": "string",
    "city": "string",
    "locality": "string",
    "latitude": 28.535,
    "longitude": 77.391,
    "images": ["url1", "url2"]
  }
  ```
- **Response (201)**: Created `AgentListing`

#### `GET /api/agent/listings/delisted`
- **Purpose**: Fetch agent's expired listings that were auto-delisted from search feeds.
- **Response**: `AgentListing[]`

#### `POST /api/agent/listings/[id]/renew`
- **Purpose**: 1-Click renewal of an expired or near-expiry listing. Deducts ₹200 (Basic) or ₹500 (Gold) from wallet (applies 20% coupon if active).
- **Response**: `{ "success": true, "newExpiresAt": "ISO Date" }`

#### `GET /api/agent/listings/dedup-search`
- **Purpose**: Check if a property address already exists under another agent or MasterProperty ID before adding.
- **Query Params**: `address`, `latitude`, `longitude`
- **Response**: `{ "isDuplicate": boolean, "matchedMasterId": "string?" }`

#### `POST /api/agent/listings/upload-image`
- **Purpose**: Upload high-resolution property photo to cloud storage.
- **Request**: `multipart/form-data` with `file`
- **Response**: `{ "url": "string" }`

---

### 2.5 Cascade Dispatch (Uber-Style Leads) & Appointments
#### `GET /api/agent/dispatch`
- **Purpose**: Fetch pending cascade dispatch leads in the agent's batch (Batch 1: 5km $\to$ Batch 2: 10km $\to$ Batch 3: 25km).
- **Response**: `DispatchRequest[]`

#### `POST /api/dispatch/[id]/accept`
- **Purpose**: First-to-accept wins the lead. Locks customer to this agent.
- **Response**: `{ "matched": true, "customer": { "name": "string", "phone": "string" } }`

#### `GET /api/agent/appointments`
- **Purpose**: View upcoming site visit appointments scheduled with buyers.
- **Response**: `Appointment[]`

#### `PATCH /api/agent/appointments/[id]`
- **Purpose**: Confirm, reschedule, or complete a buyer appointment.
- **Request Body**: `{ "status": "CONFIRMED" | "COMPLETED" | "CANCELLED" }`
- **Response**: Updated `Appointment`

---

### 2.6 Inter-Agent B2B Broadcast & Deal Stepper
#### `GET /api/agent/broadcast`
- **Purpose**: Browse active property requirement broadcasts from other agents in your city/radius.
- **Response**: `AgentBroadcast[]`

#### `POST /api/agent/broadcast`
- **Purpose**: Post a new client property requirement (society, budget, flat size, radius).
- **Request Body**:
  ```json
  {
    "clientRequirement": "string",
    "society": "string",
    "minPrice": 5000000,
    "maxPrice": 7000000,
    "latitude": 28.535,
    "longitude": 77.391,
    "radiusKm": 10
  }
  ```
- **Response (201)**: Created `AgentBroadcast`

#### `GET /api/agent/broadcast/own`
- **Purpose**: Manage broadcasts posted by logged-in agent.
- **Response**: `AgentBroadcast[]`

#### `GET /api/agent/broadcast/societies`
- **Purpose**: Autocomplete societies/colonies list in the area.
- **Response**: `string[]`

#### `POST /api/agent/broadcast/[id]/respond`
- **Purpose**: Respond to another agent's requirement with a matching property.
- **Request Body**: `{ "message": "string", "propertyListingId?": "string" }`
- **Response**: `{ "chatId": "string" }`

#### `GET /api/agent/broadcast/[id]/chat/[agentId]`
- **Purpose**: Fetch message history in inter-agent chat.
- **Response**: `ChatMessage[]`

#### `POST /api/agent/broadcast/[id]/chat/[agentId]`
- **Purpose**: Send encrypted message in inter-agent chat.
- **Request Body**: `{ "content": "string" }`
- **Response**: `ChatMessage`

#### `POST /api/agent/broadcast/[id]/close`
- **Purpose**: Close requirement broadcast when property is acquired.
- **Response**: `{ "success": true }`

#### `GET /api/agent/deals`
- **Purpose**: List deals involving this agent as Buyer Agent or Seller Agent.
- **Response**: `Deal[]`

#### `POST /api/agent/deals`
- **Purpose**: Initiate a B2B co-brokering deal from an ongoing chat.
- **Request Body**:
  ```json
  {
    "broadcastId": "string?",
    "otherAgentId": "string",
    "propertyTitle": "string",
    "agreedPrice": 8500000,
    "totalCommission": 170000
  }
  ```
- **Response (201)**: Created `Deal` (10% platform share auto-calculated, 45% buyer agent, 45% seller agent)

#### `PATCH /api/agent/deals/[id]/stage`
- **Purpose**: Advance deal lifecycle stage:
  - `ACTIVE` $\to$ `TOKEN_RECEIVED` $\to$ `AGREEMENT_DONE` $\to$ `REGISTRY_COMPLETED` $\to$ `CLOSED`.
  - Reaching `REGISTRY_COMPLETED` automatically triggers 45%-45% wallet payout to both agents!
- **Request Body**: `{ "stage": "DealStatus", "tokenAmount?": number, "agreementUrl?": "string", "registryDeedUrl?": "string" }`
- **Response**: Updated `Deal`

---

### 2.7 Direct Customer Gold Feed & Physical Visits
#### `GET /api/agent/gold-listings`
- **Purpose**: Live CRM feed of approved Customer Direct Gold listings within 5km of agent's shop. Agents can contact owner or upload professional photos.
- **Response**: `(AgentListing & { distanceKm: number })[]`

#### `GET /api/agent/visits`
- **Purpose**: List logged physical site visits with GPS coordinates and OTP verification status.
- **Response**: `DirectPropertyVisit[]`

#### `POST /api/agent/visits/otp`
- **Purpose**: Send 6-digit OTP to customer/owner when agent is physically on-site.
- **Request Body**: `{ "listingId": "string", "latitude": number, "longitude": number }`
- **Response**: `{ "otpSent": true }`

---

### 2.8 Wallet Ledger & Payouts
#### `GET /api/agent/commissions`
- **Purpose**: Full ledger history of credits (Unlocks ₹50, Gold Referral ₹250, Deal Commissions 45%, Plan Referral ₹500/₹1,000) and debits.
- **Response**: `CommissionLedgerEntry[]`

#### `GET /api/agent/payouts`
- **Purpose**: Withdrawal history and status.
- **Response**: `PayoutRequest[]`

#### `POST /api/agent/payouts`
- **Purpose**: Request wallet balance withdrawal to bank account. (Locked if agent membership is expired).
- **Request Body**: `{ "amount": 5000, "bankAccount": "string", "ifsc": "string" }`
- **Response (201)**: Created `PayoutRequest`

#### `GET /api/agent/digest`
- **Purpose**: Daily briefing summary of new leads, expiry warnings, and cycle target progress.
- **Response**: Daily digest summary object.

#### `GET /api/agent/investors`
- **Purpose**: Fetch investors mapped to this agent for high-ticket property syndications.
- **Response**: `InvestorProfile[]`

---

# 3. Buyer / Customer Panel APIs

Access for public buyers, property seekers, and registered customers.

### 3.1 Public Property Search & Urgency Filters
#### `GET /api/listings`
- **Auth**: Public
- **Purpose**: Browse active property listings with location, price, BHK, and type filters. Excludes auto-delisted expired properties. Deprioritizes unrenewed agent listings to bottom of feed.
- **Query Params**: `city`, `locality`, `listingType`, `propertyType`, `minPrice`, `maxPrice`, `page`, `limit`
- **Response**: `{ "listings": AgentListing[], "total": number }`

#### `GET /api/listings/hot-deals`
- **Auth**: Public
- **Purpose**: Fetch urgent sale properties in Month 6 of owner agreement ($\le$ 30 days remaining) tagged with animated `🔥 Hot Deal` badge.
- **Response**: `AgentListing[]` (sorted by `agreementExpiryDate ASC`)

#### `GET /api/listings/[slug]`
- **Auth**: Public (details masked unless unlocked)
- **Purpose**: View property details. Hides exact address and owner/agent phone unless buyer holds an active unlock pass.
- **Response**: `AgentListing & { isUnlocked: boolean, assignedAgent?: AgentProfile }`

---

### 3.2 Lead Unlock Pass & Exclusivity
#### `POST /api/listings/[slug]/unlock`
- **Auth**: Buyer session required
- **Fee**: ₹100 per unlock.
- **Split**: **₹50 (50%) credited instantly to listing agent's wallet**, ₹50 to platform.
- **Protection**: Unlocks exact address and phone number with **24-hour exclusivity lock** between buyer and assigned agent.
- **Response**: `{ "unlocked": true, "assignedAgent": AgentProfile, "exactAddress": "string", "expiresAt": "ISO Date" }`

---

### 3.3 Customer Protection: 1-Time Free Agent Switch
#### `POST /api/buyer/switch-agent`
- **Auth**: Buyer session required
- **Purpose**: If the assigned agent does not respond or customer is unsatisfied within the 24-hour window, customer can switch to the next nearest / top-rated Prime agent **for free** (no second ₹100 charge).
- **Request Body**:
  ```json
  {
    "agentListingId": "string",
    "reason": "Agent not answering calls"
  }
  ```
- **Response**: `{ "success": true, "switched": true, "newAgent": AgentProfile }`

---

### 3.4 In-Person Direct Visit & Anti-Bypass Legal Deed
#### `POST /api/buyer/direct-visit/request`
- **Auth**: Buyer session required
- **Purpose**: Trigger GPS-tagged physical visit when customer is on site without an agent. Captures browser GPS coordinates and dispatches 6-digit OTP to property owner.
- **Request Body**:
  ```json
  {
    "listingId": "string",
    "latitude": 28.5352,
    "longitude": 77.3915,
    "accuracy": 12.5
  }
  ```
- **Response**: `{ "visitId": "string", "otpDispatched": true }`

#### `POST /api/buyer/direct-visit/verify`
- **Auth**: Buyer session required
- **Purpose**: Buyer enters the 6-digit OTP received from the owner on-site:
  1. Verifies physical visit with GPS audit proof.
  2. Automatically generates binding **`PlatformAntiBypassAgreement` deed**.
  3. Binds buyer and owner to 1% platform service fee if deal concludes within 12 months.
- **Request Body**:
  ```json
  {
    "visitId": "string",
    "otp": "482910"
  }
  ```
- **Response**: `{ "verified": true, "agreement": PlatformAntiBypassAgreement }`

#### `POST /api/agreements/[id]/sign`
- **Auth**: Authenticated User (Buyer or Owner)
- **Purpose**: Digitally sign/accept terms of the platform anti-bypass legal deed.
- **Response**: Updated `PlatformAntiBypassAgreement`

---

### 3.5 Customer Direct Gold Self-Listing
#### `POST /api/gold-listings`
- **Auth**: Buyer session required
- **Fee**: ₹500 Gold Membership Pass (90 days validity).
- **Split**: If referred by an Agent Code, **₹250 (50%) is instantly credited to the agent's wallet**, ₹250 to platform.
- **Moderation**: Listing is created with `approvalStatus: "PENDING"` and submitted to Admin Anti-Fake Moderation Queue.
- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "price": 9500000,
    "exactAddress": "string",
    "city": "string",
    "latitude": 28.535,
    "longitude": 77.391,
    "images": ["url1", "url2"],
    "referredByAgentCode": "AGT-1024"
  }
  ```
- **Response (201)**: Created `AgentListing` (status `PENDING`)

#### `POST /api/gold-listings/upload-image`
- **Auth**: Buyer session required
- **Purpose**: Upload customer property images for Gold listing.
- **Request**: `multipart/form-data` with `file`
- **Response**: `{ "url": "string" }`

#### `POST /api/gold-listings/verify`
- **Auth**: Buyer session required
- **Purpose**: Verify Razorpay payment signature for Gold Self-Listing Pass.
- **Request Body**: `{ "razorpayOrderId": "string", "razorpayPaymentId": "string", "razorpaySignature": "string" }`
- **Response**: `{ "verified": true }`

---

### 3.6 Buyer Appointments & No-Show Protection
#### `POST /api/buyer/appointments`
- **Auth**: Buyer session required
- **Purpose**: Schedule an in-person viewing appointment with the assigned agent.
- **Request Body**: `{ "agentListingId": "string", "scheduledAt": "ISO Date" }`
- **Response (201)**: Created `Appointment`

#### `POST /api/buyer/appointments/[id]/no-show`
- **Auth**: Buyer session required
- **Purpose**: Report agent no-show if agent fails to arrive for scheduled site visit. Automatically strikes agent profile and re-assigns lead.
- **Response**: `{ "reported": true, "reassigned": true }`

---

# 4. Investor Panel APIs

Access restricted to users with `role: "INVESTOR"`.

#### `GET /api/investor/me`
- **Purpose**: Fetch investor dashboard profile: committed capital, active projects, and total yield received.
- **Response**: `InvestorProfile`

#### `GET /api/investor/ledger`
- **Purpose**: Financial statement ledger showing capital injections, interest distributions, and deal profit payouts.
- **Response**: `InvestorLedgerEntry[]`

#### `GET /api/investor/documents`
- **Purpose**: Access investment deeds, MoUs, project site progress photos, and quarterly audit reports.
- **Response**: `InvestorDocument[]`

---

# 5. Public & Shared Services APIs

Publicly accessible utility and geo services.

### 5.1 Geographic Location Hierarchy
#### `GET /api/geo/countries`
- **Purpose**: List supported countries (defaults to India).
- **Response**: `Country[]`

#### `GET /api/geo/states`
- **Purpose**: List states in India.
- **Response**: `State[]`

#### `GET /api/geo/cities`
- **Purpose**: List cities in a state.
- **Query Params**: `stateId`
- **Response**: `City[]`

#### `GET /api/geo/localities`
- **Purpose**: List localities/sectors in a city.
- **Query Params**: `cityId`
- **Response**: `Locality[]`

#### `GET /api/geo/location-listings`
- **Purpose**: Count active properties grouped by locality for SEO landing pages.
- **Query Params**: `citySlug`, `localitySlug?`
- **Response**: `{ "locality": "string", "count": number }[]`

#### `GET /api/geo/nearest`
- **Purpose**: Find nearest Prime agents or properties from GPS coordinates.
- **Query Params**: `latitude`, `longitude`, `radiusKm?`
- **Response**: `AgentProfile[]`

---

### 5.2 Uploads & File Processing
#### `POST /api/upload`
- **Purpose**: Generic image upload endpoint for listing galleries.
- **Request**: `multipart/form-data` with `file`
- **Response**: `{ "url": "string" }`

#### `POST /api/upload/document`
- **Purpose**: PDF/Document upload endpoint for compliance deeds, RERA certificates, and agreements.
- **Request**: `multipart/form-data` with `file`
- **Response**: `{ "filename": "string", "url": "string" }`

---

### 5.3 Reviews, Ratings & Leaderboard
#### `GET /api/rate/[agentCode]`
- **Purpose**: Public rating view for an agent code.
- **Response**: `{ "agentCode": "string", "ratingAvg": 4.9, "totalReviews": 18 }`

#### `POST /api/rate/[agentCode]`
- **Auth**: Buyer session required
- **Purpose**: Submit star rating (1–5) and review for an agent after property viewing or deal closing.
- **Request Body**: `{ "rating": 5, "comment": "Excellent experience, showed 3 verified properties." }`
- **Response**: `Rating`

#### `GET /api/leaderboard`
- **Auth**: Public
- **Purpose**: Top-performing Prime Agents of the month ranked by verified deals, fast response time, and 60-day review cycle carry-forward score.
- **Response**: `LeaderboardAgent[]`

---

### 5.4 Uber-Style Cascade Dispatch Verification
#### `POST /api/dispatch/verify`
- **Auth**: Public or Buyer
- **Purpose**: Verify mobile phone OTP before releasing cascade dispatch buzzer to agents.
- **Request Body**: `{ "phone": "string", "otp": "string" }`
- **Response**: `{ "verified": true }`

#### `POST /api/dispatch/[id]/cancel`
- **Auth**: Buyer session required
- **Purpose**: Cancel a pending dispatch request if buyer finds a property or leaves area.
- **Response**: `{ "cancelled": true }`

---

### 5.5 Authentication Routes
#### `POST /api/auth/[...nextauth]`
- **Auth**: Public
- **Purpose**: NextAuth authentication engine handling credentials login, session tokens, and logout across all panels (`ADMIN`, `AGENT`, `BUYER`, `INVESTOR`).
