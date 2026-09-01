# API Requirements Specification (New Modules)

Consolidated specification for all new REST API endpoints required across the 8 development modules derived from the client specification PDFs:
- **PDF 1**: `Prime Agents Targets & Revenue Split Master` (7 pages)
- **PDF 2**: `Area-Wise Workflows, Broadcasts, Buzzer & Lead Routing Logic` (13 pages)

---

## Module 1: Basic vs Prime Agent Membership & Tiered Auto-Pay

### `GET /api/agent/subscription/plans`
- **Auth**: Public or Agent session
- **Purpose**: Fetch available agent membership plans:
  - **Basic Plan**: ₹1,000 / month (50% referral split to agent wallet, 50% company)
  - **Prime Plan**: ₹2,000 / month (50% referral split to agent wallet, 50% company)
- **200 Response**:
  ```json
  [
    { "id": "basic", "name": "Basic Plan", "price": 1000, "validityDays": 30, "split": { "agent": 500, "company": 500 } },
    { "id": "prime", "name": "Prime Plan", "price": 2000, "validityDays": 30, "split": { "agent": 1000, "company": 1000 } }
  ]
  ```

### `POST /api/agent/subscription/select-plan`
- **Auth**: Agent session required (verified agent)
- **Purpose**: Select or switch between Basic and Prime membership plans.
- **Request Body**:
  ```json
  { "planType": "BASIC" | "PRIME", "paymentMode": "WALLET" | "ONLINE" }
  ```
- **200 Response**: `{ "subscriptionId": "string", "planType": "PRIME", "activeUntil": "ISO-Date", "primeStatus": true }`
- **400**: `{ "error": "insufficientWalletBalance" | "invalidPlan" }`

### `GET /api/agent/subscription/status`
- **Auth**: Agent session required
- **Purpose**: Get current subscription status, days left until renewal, wallet auto-deduct eligibility, and 5-day warning flag.
- **200 Response**:
  ```json
  {
    "planType": "PRIME",
    "active": true,
    "expiresAt": "ISO-Date",
    "daysRemaining": 14,
    "renewalAlertActive": false,
    "hasAutoPayMandate": true,
    "walletBalance": 3500,
    "isVisibilityDeprioritized": false
  }
  ```

### `POST /api/agent/subscription/autopay-mandate`
- **Auth**: Agent session required
- **Purpose**: Register UPI / Google Pay Auto-Pay mandate as fallback for wallet auto-renewal.
- **Request Body**: `{ "mandateId": "string", "vpa": "user@upi", "maxAmount": 2000 }`
- **200 Response**: `{ "success": true, "mandateActive": true }`

---

## Module 2: Property Auto-Delisting Engine & 6-Month Hot Deals Agreement Countdown

### `POST /api/listings/basic`
- **Auth**: Buyer / Customer session
- **Purpose**: Self-upload property on Basic 1-month plan for ₹200 (50% ₹100 agent split, 50% company). Auto-delists after 30 days.
- **Request Body**: Listing fields + `referredByAgentCode?`
- **201 Response**: `{ "listingId": "string", "propertyCode": "string", "expiresAt": "ISO-Date" }`

### `GET /api/listings/hot-deals`
- **Auth**: Public
- **Query Params**: `cityId?`, `localityId?`, `bhk?`, `urgency?` (`NORMAL` | `PRIORITY` | `HOT_DEAL`)
- **Purpose**: Retrieve sale properties sorted by agreement expiry ascending (`Expiry Date ASC`). Includes urgency badges:
  - **Green (Months 1–3)**: Normal listing mode
  - **Yellow (Months 4–5)**: Priority Listing badge
  - **Red (Month 6 / Last 30 Days)**: "Hot Deal / Urgent Sale" tag
- **200 Response**:
  ```json
  [
    {
      "id": "string",
      "propertyCode": "PROP-99482",
      "title": "string",
      "agreementStartDate": "ISO-Date",
      "agreementExpiryDate": "ISO-Date",
      "daysLeft": 22,
      "urgencyLevel": "HOT_DEAL",
      "urgencyBadge": "red"
    }
  ]
  ```

### `POST /api/agent/listings/{id}/relist`
- **Auth**: Agent session required
- **Purpose**: Re-activate an expired/delisted property. Generates a fresh Master Property Code and records the fresh listing fee.
- **200 Response**: `{ "listingId": "string", "newPropertyCode": "PROP-99510", "newExpiryDate": "ISO-Date" }`

### `GET /api/agent/listings/expiring`
- **Auth**: Agent session required
- **Purpose**: Fetch agent's listings expiring within 30, 15, 7, or 2 days, with 20% discount coupon eligibility for 48h urgency renewals.
- **200 Response**: `{ "expiringListings": [...] }`

---

## Module 3: Agent 60-Day Target Performance Matrix & Admin Call Control Panel

### `GET /api/agent/targets`
- **Auth**: Agent session required
- **Purpose**: Returns the agent's current 60-day rolling performance cycle:
  - Day X of 60
  - Agent-to-Agent Network: X / 20
  - Property Listings/Updates: Y / 30
  - Investor Codes Generated: Z / 5
  - Risk Level: `LOW` (Green), `MEDIUM` (Yellow), `HIGH` (Red)
  - Warning Badge active (if Day >= 30 and overall progress < 50%)
- **200 Response**:
  ```json
  {
    "cycleDay": 45,
    "cycleExpiryDate": "ISO-Date",
    "metrics": {
      "agentsReferred": { "current": 8, "target": 20 },
      "propertiesListed": { "current": 12, "target": 30 },
      "investorsOnboarded": { "current": 1, "target": 5 }
    },
    "overallProgressPercent": 40,
    "riskLevel": "HIGH",
    "warningBadge": true
  }
  ```

### `GET /api/admin/agents/targets`
- **Auth**: Admin session required
- **Query Params**: `riskLevel?` (`HIGH` | `MEDIUM` | `ALL`), `page?`, `search?`
- **Purpose**: Central Admin Call Control Panel tabular feed of all agents with their 60-day progress, pending targets, and quick call/warning triggers.
- **200 Response**:
  ```json
  {
    "agents": [
      {
        "agentProfileId": "string",
        "agentCode": "AGT-1021",
        "name": "Rahul Sharma",
        "phone": "9876543210",
        "cycleDay": 45,
        "overallProgress": 40,
        "pendingTargets": { "agents": 12, "properties": 18, "investors": 4 },
        "riskLevel": "HIGH",
        "statusBadge": "WARNING"
      }
    ]
  }
  ```

### `POST /api/admin/agents/{id}/call-action`
- **Auth**: Admin session required
- **Purpose**: Log or initiate an admin control call to a low-performing/warning agent via Exotel Virtual Masking.
- **Request Body**: `{ "callType": "TARGET_WARNING" | "ROUTINE_CHECK", "notes?": "string" }`
- **200 Response**: `{ "callId": "string", "status": "INITIATED" }`

### `POST /api/admin/agents/{id}/whatsapp-warning`
- **Auth**: Admin session required
- **Purpose**: Dispatch automated WhatsApp Performance Warning template to the agent.
- **200 Response**: `{ "success": true, "messageId": "string", "sentAt": "ISO-Date" }`

---

## Module 4: Central Admin BUY Leads Engine & Inquiry Routing

### `POST /api/leads/inquiry`
- **Auth**: Public or Customer session
- **Purpose**: Customer submits property requirement for **BUY**, **RENT**, **SELL**, or **LETOUT**.
  - **BUY**: Lead routes directly to Central Admin Panel (`/admin/leads/buy`), with high-priority flag if budget >= ₹1 Crore. WhatsApp confirmation sent to customer.
  - **RENT / SELL / LETOUT**: Lead dispatches to top-rated nearby prime agents within 1–5 km radius.
- **Request Body**:
  ```json
  {
    "customerName": "string",
    "customerPhone": "string",
    "transactionType": "BUY" | "RENT" | "SELL" | "LETOUT",
    "city": "string",
    "locality": "string?",
    "budgetMin": 5000000,
    "budgetMax": 12000000,
    "configuration": "3 BHK",
    "latitude": 28.628,
    "longitude": 77.365
  }
  ```
- **201 Response**:
  ```json
  {
    "leadId": "LD-9021",
    "routedTo": "HEADQUARTERS_BUY_TEAM" | "NEARBY_AGENTS",
    "isHighPriority": true,
    "status": "SUBMITTED"
  }
  ```

### `GET /api/admin/leads/buy`
- **Auth**: Admin session required
- **Query Params**: `priority?` (`HIGH` | `NORMAL`), `city?`, `status?` (`NEW` | `ASSIGNED` | `IN_PROGRESS` | `CLOSED`)
- **Purpose**: Central Admin panel incoming BUY inquiries table with ₹1 Cr+ Priority Tagging.
- **200 Response**:
  ```json
  [
    {
      "id": "LD-9021",
      "customerName": "Vikram Singh",
      "maskedPhone": "XXXX-8902",
      "city": "Noida",
      "locality": "Sector 62",
      "budgetMax": 12000000,
      "isHighPriority": true,
      "assignedToStaffId": "staff-101",
      "status": "NEW",
      "createdAt": "ISO-Date"
    }
  ]
  ```

### `POST /api/admin/leads/buy/{id}/assign`
- **Auth**: Admin session required
- **Purpose**: Assign BUY lead to Senior Sales Executive or deal team member.
- **Request Body**: `{ "staffUserId": "string" }`
- **200 Response**: `{ "success": true, "leadId": "string", "assignedTo": "string" }`

### `POST /api/admin/leads/buy/{id}/call`
- **Auth**: Admin session required
- **Purpose**: Initiate virtual masked phone call between sales executive and buyer using Exotel.
- **200 Response**: `{ "callSid": "string", "status": "CALLING" }`

---

## Module 5: Pincode / Area-Wise Lead Routing Rules

### `GET /api/admin/area-routing`
- **Auth**: Admin session required
- **Purpose**: List configured Pincode/Area to designated Prime Agent routing mappings.
- **200 Response**:
  ```json
  [
    {
      "id": "string",
      "pincode": "201014",
      "areaName": "Indirapuram, Ghaziabad",
      "designatedAgentId": "agent-id",
      "designatedAgentCode": "AGT-1024",
      "active": true
    }
  ]
  ```

### `POST /api/admin/area-routing`
- **Auth**: Admin session required
- **Purpose**: Map a Pincode or Area to an Agent Code so matching customer leads auto-route directly to that agent instead of random broadcast.
- **Request Body**: `{ "pincode": "string", "areaName": "string", "agentCode": "AGT-1024" }`
- **201 Response**: `{ "id": "string", "created": true }`

### `DELETE /api/admin/area-routing/{id}`
- **Auth**: Admin session required
- **Purpose**: Remove an area-to-agent routing rule.
- **200 Response**: `{ "success": true }`

---

## Module 6: Geofenced Buzzer Limits, Instant Blacklist & Auto-Split

### `POST /api/buyer/buzzer`
- **Auth**: Buyer session required
- **Purpose**: Trigger instant nearby agent buzzer search. Enforces:
  - Strict 5km Geofenced limit from customer's initial search coordinates.
  - Max 3 buzzers per day with 1-hour cooldown between buzzers.
  - Max 3 buzzers per week.
  - 5-minute delayed response alert if no agent accepts.
- **Request Body**: `{ "latitude": 28.535, "longitude": 77.391 }`
- **201 Response**: `{ "dispatchId": "string", "agentsNotified": 8, "remainingBuzzersToday": 2 }`
- **429**: `{ "error": "cooldownActive" | "dailyLimitReached" | "outside5kmGeofence", "nextAllowedAt": "ISO-Date" }`

### `POST /api/buyer/split-agent`
- **Auth**: Buyer session required
- **Purpose**: Customer rejects current agent:
  1. Instantly blacklists that agent for this customer (never shown again).
  2. Dispatches alert to agent: "Customer has blacklisted your code."
  3. Auto-assigns the 2nd highest-rated Prime Agent in 5km radius without manual intervention.
  4. Triggers WhatsApp reassurance message to customer.
- **Request Body**: `{ "currentAgentId": "string", "reason": "string", "appointmentId?": "string" }`
- **200 Response**: `{ "newAgentAssigned": { "agentCode": "AGT-1089", "name": "Vikram Patel", "rating": 4.9 } }`

---

## Module 7: Invoicing, TDS 194H & GST Compliance

### `GET /api/invoices/{id}`
- **Auth**: Authenticated session (Owner of transaction or Admin)
- **Purpose**: Retrieve TDS-compliant 18% GST tax invoice data and PDF link for agent registration, property listing, or customer unlock fees.
- **200 Response**:
  ```json
  {
    "invoiceNumber": "INV-2026-00481",
    "hsnCode": "997212",
    "baseAmount": 2000,
    "gstAmount": 360,
    "totalAmount": 2360,
    "customerPan": "ABCDE1234F",
    "companyGstin": "07AAAAA0000A1Z5",
    "downloadUrl": "/invoices/INV-2026-00481.pdf"
  }
  ```

### `GET /api/admin/tax/tds-report`
- **Auth**: Admin session required
- **Query Params**: `month?`, `year?`
- **Purpose**: Section 194H (5% Brokerage/Commission TDS) deduction ledger for quarterly government filings.
- **200 Response**: `{ "deductions": [...], "totalTdsCollected": 45000 }`

---

## Module 8: Watermarking, Meta Channel & Profile Linking

### `POST /api/agent/profile/meta-link`
- **Auth**: Agent session required
- **Purpose**: Link official company WhatsApp/Meta channel to agent profile.
- **Request Body**: `{ "metaChannelId": "string" }`
- **200 Response**: `{ "success": true }`

### `POST /api/agent/profile/website`
- **Auth**: Agent session required
- **Purpose**: Add external personal website URL to agent public profile.
- **Request Body**: `{ "websiteUrl": "https://agentrealty.com" }`
- **200 Response**: `{ "success": true, "websiteUrl": "string" }`

### `POST /api/user/accept-terms`
- **Auth**: Authenticated session
- **Purpose**: Record user acceptance of platform Terms and Conditions (Agent, Customer, or Investor).
- **Request Body**: `{ "termsVersion": "2026.1", "accepted": true }`
- **200 Response**: `{ "success": true, "acceptedAt": "ISO-Date" }`
