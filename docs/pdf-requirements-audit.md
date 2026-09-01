# Master Requirements & Gap Analysis (PDF 1 & PDF 2)

Comprehensive audit and implementation specification consolidating all requirements from the two client specification PDFs:
- **PDF 1**: `Prime Agents Targets & Revenue Split Master` (7 pages)
- **PDF 2**: `Area-Wise Workflows, Broadcasts, Buzzer & Lead Routing Logic` (13 pages)

---

## 1. Line-by-Line Requirements Breakdown

### PDF 1: Prime Agents Targets & Revenue Split Master

#### Page 1: Revenue & Commission Split Master Table
| Transaction Type | Total Amount | Validity / Frequency | Agent Code Wallet | Company Account | Status in Codebase |
|---|---|---|---|---|---|
| **Agent Registration (Basic Plan)** | ₹1,000 | 1 Month Renewal | ₹500 (50%) | ₹500 (50%) | ⚠️ Needs Basic plan option & 50% split logic |
| **Agent Registration (Prime Plan)** | ₹2,000 | 1 Month Renewal | ₹1,000 (50%) | ₹1,000 (50%) | ⚠️ Currently hardcoded to single prime plan |
| **Customer Property Watch Fees** | ₹100 | 1 Month / 1-Time | ₹50 (50%) | ₹50 (50%) | ✅ Built (`PropertyUnlock`, 50/50 split) |
| **Property Listing (Basic)** | ₹200 | 1 Month (Auto-Delist) | ₹100 (50%) | ₹100 (50%) | ❌ Net-New: ₹200 basic listing with 1-month auto-delist |
| **Property Listing (Gold)** | ₹500 | 3 Months (Auto-Delist) | ₹250 (50%) | ₹250 (50%) | ⚠️ Built payment & 50% split; missing 3-month auto-delist |
| **Investor Code Onboarding Fee** | ₹20,000 | 1 Year Validity | ₹2,000 (10%) | ₹18,000 (90%) | ✅ Built (`InvestorProfile`, 10% referral credit) |

#### Page 2: Expiry Rules & 60-Day Agent Target Matrix
1. **Property Listing Expiry Rule**: Basic (1 month / 30 days) ya Gold (3 months / 90 days) plan khatam hote hi property system se automatically REMOVE/DELIST ho jayegi. Re-list karne par naya Property Code generate hoga aur fresh listing fee lagegi.
2. **Investor Subscription & Admin Renewal Tracker**:
   - Registration Fee: ₹20,000 / year (365 days).
   - Expiry se 30 din pehle Admin Panel par automated renewal reminder pop-up aur push notification trigger hoga.
3. **Agent 60-Day Target Performance Matrix**:
   - Rolling 2-month (60 days) window mein minimum targets:
     - **Agent-to-Agent Network**: 20 New Agent Codes
     - **Property Listings / Updates**: 30 Properties
     - **Investor Code Generation**: 5 Investor Codes
   - Day 30 Review: Agar targets 50% se kam hon toh Warning Badge trigger hoga.
   - Company Dashboard par "Low Performing / Target Warning Agents" tabular filter.

#### Page 3: Commission & Joint Deal Profit Distribution
- Total Profit Pool: ₹5,00,000 example:
  - **Investor Code Share**: 40% (₹2,00,000)
  - **Company Code Share**: 40% (₹2,00,000)
  - **Agent Code (Investor Referrer)**: 10% (₹50,000)
  - **Property Renovation Expense**: 10% (₹50,000)
  - ✅ Built (`computeProfitSplit`, `ProfitDistribution`).

#### Page 4: Direct Brokerage & Deal Value Breakdown
- Property Value: ₹1,00,00,000 (1 Crore) deal:
  - **Seller Agent Brokerage (A)**: 1% (₹1,00,000)
  - **Buyer Agent Brokerage (B)**: 1% (₹1,00,000)
  - **Investor Code Profit Share**: 10% (₹50,000)
  - **Gross Agent Earning**: ₹2,50,000
  - **Net Payout Transferred**: Flat 5% TDS (Section 194H) auto-deducted (PAN mandatory). ✅ Built.

#### Page 5: Automated System Rules & Expiry Logic
1. **Instant Wallet Credit & Invoice Generation**: Real-time 50/50 ya 10/90 split on payment gateway + TDS-compliant tax invoice.
2. **Property Auto-Delisting Engine**: Cron job execution on validity date (30d Basic / 90d Gold). Re-activation generates new code.
3. **Investor Renewal & Target Alerts**: 30 days before investor expiry alert on Admin Panel. Day 30 agent target review.

#### Page 6: Company Admin Call Control Panel
- Dashboard UI Components & Wireframe:
  - Top Status Bar: Status Badge (ACTIVE Green, WARNING Yellow, INACTIVE/HOLD Red) + Cycle Tracker ("Day X of 60").
  - Tabular columns: Agent Name & Code | Target Progress (Day X/60, Overall %) | Pending Targets | Risk Level (🔴 High Risk, 🟡 Medium Risk) | Action ([📞 Call Agent], [💬 Send WhatsApp Warning]).

#### Page 7: Expiry Notifications, Incentives & Investor SPV Agreement
1. **Expiry Reminders**:
   - 7 Days Before: WhatsApp & App alert.
   - 2 Days Before: Urgency Alert (48 hours remaining, 20% discount coupon).
   - On Expiry: Direct re-listing link with 1-tap re-activation.
2. **Target Count Carry-Forward Incentive**: Renewal karne par 60-day cycle target count drop nahi hoga.
3. **18% GST Structuring**: Registration/listing fee par 18% GST auto-invoice.
4. **Investor Legal Security (SPV / Partnership Agreement)**: Standard SPV / Partnership agreement for ₹20,000 onboarding & 40% equity/profit share (RERA/SEBI compliance).

---

### PDF 2: Area-Wise Workflows, Broadcasts, Buzzer & Lead Routing Logic

#### Pages 1–3: Agent Plans, Feed Visibility & Master Property Architecture
1. **Area Wise Payment Modes**: Configurable payment methods.
2. **Basic (₹1,000) vs Prime (₹2,000) Agent Membership**:
   - Wallet deduction first -> fallback to UPI / Google Pay Auto-Pay mandate -> 5 days pre-renewal alert if balance is low.
3. **Non-Renewal Penalty (Visibility Pushback)**:
   - Agent properties are not deleted, but pushed to lowest priority in customer feed; paid agents shown first.
   - Agent without renewal can upload in agent code, but properties hidden from customers until renewal paid.
   - Commission stays in wallet, but withdrawal is blocked until renewal is active.
4. **Agent Shop Location Fixed**:
   - Agent operates from anywhere globally, but properties always display the agent's registered shop/office location. ✅ Built.
5. **Master Property Code Deduplication**:
   - Physical address + Geo-coordinates + Unit number generates Master Code (e.g. `PROP-99482`). Multiple agents can co-market. ✅ Built.
6. **Real-Time Inventory Dashboard (Prime Agents)**:
   - Live feed of 2BHK, 3BHK, commercial rentals. Filters: Date, Time, City/Area, BHK, Agent Code. Direct chat & direct call. ✅ Built.
7. **Customer Requirement Broadcast Form (Dropdowns Only)**:
   - Radius: 1km, 3km, 5km.
   - Society: Auto-populated for radius.
   - Flat Size: 1, 2, 3, 4 BHK.
   - Transaction Type: Rent, Buy, Sell, LetOut.
   - Budget Range: ₹20k–30k / ₹80L–1Cr. ✅ Built.
8. **Nearby Amenities via Places API**:
   - Nearest Metro, Railway, Hospital, Grocery within 1, 3, 5 km auto-attached to listing. ✅ Built (`amenityLookup.ts`).
9. **B2B Broadcast Engine & 1-Click Code-to-Code Encrypted Chat**:
   - Push alert to 1–5km radius. 1-click "I Have This Property" generates `chat_room_id` on Socket.io. Non-prime agents cannot chat. ✅ Built.

#### Pages 4–7: Site Visits, Routing Rules, Buzzer Limits & CRM Board
10. **Calendar Wise Site Visits & Auto-Reminders**:
    - Meeting scheduler for property visits. Reminders 2 hours before to customer and agent. Customer sees agent code + map link; agent sees customer name + masked number. ✅ Built.
11. **Company Rules (Area-Wise Lead Auto-Allocation)**:
    - Admin panel logic: Map specific Pincodes or Area Codes to designated Prime Agent IDs. Bypasses random broadcast and routes directly to the designated agent. ⚠️ Partial (Schema exists `AreaAgentAssignment`, needs admin UI and dispatch integration).
12. **Customer Buzzer Limits & Cascades**:
    - Strict 5km geofenced buzzer lock (cannot buzz remote areas >5km from search origin).
    - Rate limits: Max 3 times a day (1-hour cooldown between attempts), max 3 times a week; 30-day or 7-day validity.
    - 1-minute accept/pass timer per batch (5–10 agents).
    - 5-minute delayed response alert: if no agent responds, WhatsApp alert sent and lead re-routed.
13. **Lead Segregation: BUY vs RENT/SELL/LETOUT**:
    - **RENT / SELL / LETOUT**: Dispatched to nearby local Prime Agents.
    - **BUY Leads**: Routed directly to **Central Admin Panel** (`/admin/leads/buy`).
      - Lead Priority Tagging: ₹1 Cr+ leads flagged High Priority and assigned to Senior Sales Executive.
      - Staff calling & AI Calling with Exotel virtual number masking.
      - Customer WhatsApp confirmation: "Namaste {{1}}! {{2}} mein BUY requirement submit karne ke liye dhanyawad..."
14. **Customer Support & Dispute Desk**:
    - WhatsApp / Call Support desk for commission conflicts and complaints with 2-hour SLA.
15. **Lead Management CRM Board**:
    - Table: Lead ID, Customer Name, Date & Time, Slot, Area/Location, Assigned Agent Code, Meeting Status, Current Stage. ✅ Built.

#### Pages 8–11: Anti-Poaching, Instant Agent Split & Gamification
16. **Multi-Agent Customer Conflict Alert & Anti-Poaching**:
    - Site visit customer mobile logging with OTP.
    - If customer visited with Agent A earlier for same property/society, automated alert sent to Agent A + direct chat settlement link. ✅ Built.
17. **Customer "Split Agent / Change Agent"**:
    - Customer clicks "Split Agent" -> Agent is instantly blacklisted for this customer (never shown again).
    - System auto-assigns 2nd highest-rated Prime Agent in 5km radius without manual intervention.
18. **Exotel Virtual Masked Calling**:
    - Number masking so customer, agent, and staff never see raw contact numbers.
19. **Watermarking**:
    - Automatic company logo watermark on all property photos uploaded.
20. **Gamification ("Agents of the Week" / "King of Ghaziabad")**:
    - Cards with photo, Agent Code, area, badges ("Top Seller", "Fastest Responder", "5-Star Rated"), direct call & WhatsApp buttons. ✅ Built.
21. **Terms and Conditions Acceptance**:
    - Mandatory terms acceptance button for Agents, Customers, and Investors.

#### Pages 12–13: Hot Deals & 6-Month Agreement Expiry Logic
22. **Hot Deals 6-Month Countdown Meter**:
    - Agreement Expiry Date = Agreement Start Date + 6 Months.
    - Automatic SQL Sorting: `Expiry Date ASC` (nearest expiry shows first).
    - Urgency Badges & Indicators:
      - Months 1–3 (Green): Normal listing mode.
      - Months 4–5 (Yellow): Priority Listing badge.
      - Month 6 / Last 30 Days (Red): "Hot Deal / Urgent Sale" tag.
    - Automated alerts at 30 days and 15 days remaining to local agents/sales team.
    - Target incentive for short-expiry properties.
23. **Profile Linking**:
    - Link Agent/Investor/Customer profile to company Meta/WhatsApp channel.
    - Link agent's personal website on public profile.

---

## 2. Current Codebase Gap Analysis

| Feature Area | In Schema? | In Backend Libs? | In API Routes? | In Frontend UI? | What Needs to be Done |
|---|---|---|---|---|---|
| **Basic (₹1k) vs Prime (₹2k) Agent Plans** | Partial (`Plan`) | Partial (`billing.ts`) | No | Partial | Add `AgentPlanType`, 50% referral split, wallet deduction & switch UI |
| **Visibility Pushback (Non-Renewal Penalty)** | No | No | No | No | Add `isDeprioritized` sort order in public listing feeds |
| **Property Auto-Delisting (30d Basic / 90d Gold)** | No | No | No | No | Add listing validity fields, BullMQ daily delisting job, fresh code on relist |
| **Listing Expiry Alerts & 20% Coupon** | No | No | No | No | 7-day, 2-day (with 20% coupon), and on-delist notification hooks |
| **6-Month Hot Deals Agreement Countdown** | No | No | No | No | Add `agreementStartDate`/`ExpiryDate`, ASC sort, Green/Yellow/Red badges, 30d/15d alerts |
| **Agent 60-Day Target Performance Matrix** | No | No | No | No | Add `AgentTargetCycle` tracking 20 agents / 30 listings / 5 investors, Day 30 warning badge |
| **Admin Call Control Panel (Target Warnings)** | No | No | No | No | `/admin/agents/targets` page with High/Medium risk tabs, Call Agent & WhatsApp triggers |
| **Central Admin BUY Leads Desk** | No | No | No | No | `/admin/leads/buy` page with ₹1 Cr+ Priority Tagging, staff assignment, customer WhatsApp template |
| **Pincode / Area-Wise Auto-Allocation** | Yes (`AreaAgentAssignment`) | Partial | No API | No UI | Build `/admin/area-routing` management UI and plug into dispatch priority |
| **Strict 5km Buzzer Lock & Rate Limits** | No | Partial (`AgentSwitchLog`) | No | Partial | Enforce 5km distance clamp, 3x/day (1h cooldown), 3x/week limits, 5-min delayed alert |
| **Instant Split & Auto-Reassignment** | Yes (`CustomerAgentBlock`) | Yes (`agentSwitch.ts`) | Yes | Partial | Wire "Split Agent" 1-click modal with auto-assigning 2nd highest rated prime agent |
| **18% GST Auto-Invoice Generation** | No | No | No | No | Auto-generate GST tax invoice PDF on registration/listing/unlock transactions |
| **Investor SPV / Partnership Agreement** | Partial (`CustomerInvestorAgreement`) | No | No | No | Standard SPV / Partnership agreement generator on ₹20k payment |
| **Company Photo Watermarking** | Yes (`upload.ts`) | Yes (Sharp SVG) | Yes | Yes | Ensure company watermark is applied on all upload channels |
| **Meta Channel & Personal Website Links** | Partial (`User.website`) | No | No | No | Add `metaChannelId` and agent website fields to profile form |
| **Terms & Conditions Acceptance** | No | No | No | No | Add `termsAcceptedAt` to User model and acceptance checkbox modal |

---

## 3. Implementation Phasing Strategy

To execute systematically, the work is organized into **6 actionable phases**:

### Phase A: Agent Subscription Tiers, Auto-Pay & Visibility Engine
1. Update `schema.prisma`: `AgentPlanType` (`BASIC` ₹1,000, `PRIME` ₹2,000), `mandateDetails`, `visibilityDeprioritized`.
2. Update `billing.ts`: 50/50 split on agent plan fees; wallet deduction fallback to auto-pay mandate; 5-day pre-renewal alert; demotion sets `visibilityDeprioritized: true`.
3. Update public listing queries to sort active/paid agents ahead of deprioritized agents.
4. Agent Dashboard UI: Plan selection, Auto-Pay mandate status, renewal countdown.

### Phase B: Property Auto-Delisting Engine & 6-Month Hot Deals Countdown
1. Update `schema.prisma`: `AgentListing` gains `listingFeePlan` (`BASIC_200`, `GOLD_500`), `validityDays` (30 vs 90), `delistedAt`, `agreementStartDate`, `agreementExpiryDate`.
2. Create `src/lib/delisting.ts` & BullMQ daily delisting job:
   - Delists listings past validity date.
   - Re-listing generates a new Master Property Code and fresh fee.
3. Expiry alert hooks: 7 days, 2 days (48h urgency with 20% discount coupon), on-delist notification.
4. 6-Month Hot Deals Countdown engine:
   - SQL query sorting by `agreementExpiryDate ASC`.
   - Visual Badges: Green (1–3 months), Yellow (4–5 months Priority), Red (Month 6 / Last 30 Days "Hot Deal / Urgent Sale").
   - 30-day and 15-day remaining alerts to local agents.

### Phase C: Agent 60-Day Target Performance Matrix & Admin Call Control Panel
1. Update `schema.prisma`: Add `AgentTargetCycle` model (tracks 60-day cycle, agent count / 20, property count / 30, investor count / 5, Day 30 review status, risk level).
2. Create `src/lib/agentTargets.ts`: Computes rolling 60-day performance, generates Day 30 warning badges for <50% progress.
3. Create Admin Call Control Panel (`/admin/agents/targets`):
   - Header with status badges (ACTIVE Green, WARNING Yellow, INACTIVE/HOLD Red) and Day X of 60 tracker.
   - Tabular filter for High Risk 🔴 and Medium Risk 🟡 agents.
   - Quick action buttons: Call Agent (`tel:` / virtual masking) and Send WhatsApp Warning.
4. Agent Dashboard Target Progress widget.

### Phase D: Central Admin BUY Leads Desk vs Local Agent Dispatch
1. Update `schema.prisma`: Add `CustomerInquiry` model with `InquiryType` (`BUY`, `RENT`, `SELL`, `LETOUT`), `budgetMin`, `budgetMax`, `priorityFlag`, `assignedStaffId`.
2. Build routing engine in `src/lib/inquiry.ts`:
   - If `BUY`: routes to Central Admin (`/admin/leads/buy`), triggers WhatsApp confirmation to customer, flags ₹1 Cr+ leads as High Priority.
   - If `RENT`/`SELL`/`LETOUT`: dispatches to nearby Prime Agents within 1–5 km.
3. Build Central Admin BUY Leads Desk UI (`/admin/leads/buy`):
   - Table of BUY leads with priority tags, status filter, staff assignment, and call trigger.

### Phase E: Area-Wise Pincode Routing, Geofenced Buzzer & Instant Agent Split
1. Build `/admin/area-routing` screen to manage `AreaAgentAssignment` (map Pincode/Area to designated Prime Agent ID) and plug into dispatch priority.
2. Update buzzer engine in `src/lib/buzzer.ts`:
   - Enforce 5km distance clamp from customer search coordinates.
   - Enforce 3x/day limit (1-hour cooldown), max 3x/week.
   - 5-minute delayed response alert if no agent accepts.
3. Update "Split Agent" flow:
   - Instantly blacklists outgoing agent for this customer.
   - Automatically re-assigns 2nd highest-rated Prime Agent in 5km radius without manual intervention.

### Phase F: GST Invoicing, TDS 194H, Watermarking & Profile Compliance
1. Automated 18% GST tax invoice generation (`src/lib/invoice.ts`) for registrations, listings, and unlock fees.
2. Section 194H 5% TDS deduction reporting for monthly/quarterly tax filings.
3. Investor SPV / Partnership Agreement generation PDF on ₹20,000 payment.
4. Add Meta Channel link, personal website link, and Terms & Conditions acceptance modal.
