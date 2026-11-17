# Master Commission Structure & Policy Guide
**BayaEstate / Noida Prime Properties Platform**
*Last Updated: November 2026*

---

## Executive Summary & Commission Matrix

The platform operates on an automated, multi-stream commission architecture connecting **Channel Partners (Agents)**, **Property Owners**, **Buyers**, **Investors (Referral Partners)**, and the **Company Treasury**.

Every rupee earned is tracked with immutable double-entry audit records in the **Commission Ledger** (`CommissionLedgerEntry`) and disburseable via the Channel Partner Wallet (`/agent/payments`) net of Section 194H TDS (5%).

### Quick Reference Matrix

| # | Commission Stream | Category | Agent Earning | Company Share | Trigger / Ledger Type |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Property Listing Plan (New)** | Inventory Onboarding | **50%** (₹150 / ₹250) | 50% (₹150 / ₹250) | `GOLD_SPLIT` / `UNLOCK_SPLIT` |
| **2** | **Property Renewal Royalty** | Passive Recurring Royalty | **50%** (₹150 / ₹250) | 50% (₹150 / ₹250) | `REFERRAL_CUSTOMER_RENEWAL` |
| **3** | **Partner-to-Partner Onboarding** | Network Growth | **50%** (₹500 / ₹1,000) | 50% (₹500 / ₹1,000) | `AGENT_REFERRAL` |
| **4** | **Property Detail Unlock Pass** | Consumer Leads | **50%** (₹50 via Agent) | 50% / 100% (Direct) | `UNLOCK_SPLIT` |
| **5** | **Investor Onboarding Bonus** | Capital Sourcing | **10%** (₹2,000 flat) | 90% (₹18,000) | `REGISTRATION_REFERRAL` |
| **6** | **Buyer-Side Sale Brokerage** | B2B Deal Close | **1%** of Deal Value | 0% (Zero deduction) | `BROKERAGE` |
| **7** | **Seller-Side Sale Brokerage** | B2B Deal Close | **1%** of Deal Value | 0% (Zero deduction) | `BROKERAGE` |
| **8** | **Joint Venture Deal Profit** | Flip Profit Realization | **10%** of Net Profit | 55% Unified Treasury | `DEAL_PROFIT_SHARE` |

*(Note: If a single partner represents both Buyer and Seller in a sale deal, they earn **1% + 1% = 2% Full Brokerage**).*

---

## Detailed Policy & Limitations for Each Commission

---

### Stream 1: Property Listing Plans Split (New Inventory)
* **Pricing Tiers**:
  * **Basic Listing Plan**: ₹300 (Valid for 30 days)
  * **Gold Listing Plan**: ₹500 (Valid for 90 days with Verified Priority Tag)
* **Partner Earning**:
  * Basic Plan: **₹150 (50%)** credited to Agent Wallet
  * Gold Plan: **₹250 (50%)** credited to Agent Wallet
* **Company Share**: 50% (₹150 on Basic / ₹250 on Gold) to Company Treasury
* **How It Works**:
  When a property owner lists a property through an Agent's portal or with the Agent's Channel Partner Code mapped, the listing plan fee is automatically split 50-50 upon plan activation.
* **Limitations & Niyam**:
  1. **Agent Mapping**: The property must be posted from the Agent Portal (`/agent/listings/new`) or have the Agent's Code linked.
  2. **Real-time Credit**: Commission is credited immediately upon payment confirmation.

---

### Stream 2: Property Renewal Royalty Income (Passive Recurring Royalty)
* **Royalty Rate**: **50% Recurring Split** on every renewal cycle
  * Basic Plan Renewal: **₹150** every 30 days
  * Gold Plan Renewal: **₹250** every 90 days
* **Ledger Head**: `REFERRAL_CUSTOMER_RENEWAL`
* **How It Works**:
  Once an agent lists or maps a property, the agent earns passive recurring income whenever the owner renews or relists that property after expiration (30 days for Basic, 90 days for Gold).
* **Limitations & Niyam**:
  1. **Perpetual Mapping**: As long as the property remains mapped to the Agent Code, the 50% royalty triggers indefinitely on every renewal.
  2. **Zero Paperwork**: The agent does not need to re-upload photos or re-submit forms. Owner self-service renewal auto-credits the agent's wallet.
  3. **Audit Trail**: Recorded under `REFERRAL_CUSTOMER_RENEWAL` in both Agent and Admin ledgers.

---

### Stream 3: Partner-to-Partner Onboarding Referral
* **Membership Tiers**:
  * **Basic Partner Plan**: ₹1,000 (10 property listing limit)
  * **Prime Partner Plan**: ₹2,000 (Unlimited listings + priority leads)
* **Partner Earning**:
  * Basic Tier: **₹500 (50%)**
  * Prime Tier: **₹1,000 (50%)**
* **Company Share**: 50% (₹500 / ₹1,000) to Company Treasury
* **Ledger Head**: `AGENT_REFERRAL`
* **How It Works**:
  When an existing Channel Partner refers a new broker/partner using their referral code/link, 50% of the new partner's first membership payment is awarded to the referring partner.
* **Limitations & Niyam**:
  1. **One-Time Onboarding Credit**: This commission applies strictly to the initial onboarding membership activation.
  2. **Verification Trigger**: Credits to the referring agent's wallet once the new partner's KYC and payment are approved by Admin.

---

### Stream 4: Property Detail & Contact Unlock Pass (₹100 MRP)
* **Pass Pricing**: **₹100** per property unlock
* **Revenue Distribution**:
  * **Via Agent Code + OTP**: **₹50 (50%) to Agent Wallet** + **₹50 (50%) to Company Treasury**
  * **Direct Public Visitor**: **100% (₹100) to Company Treasury** (Zero agent credit)
* **Ledger Head**: `UNLOCK_SPLIT`
* **How It Works**:
  On public property pages, sensitive information (exact flat/unit number, complete address, owner/agent contact) is hidden behind a blur lock. The buyer pays ₹100 to unlock full details.
* **Limitations & Niyam**:
  1. **Verification Requirements**: To claim the 50% agent split, the buyer must enter their Name, Mobile Number, Agent Code, and verify via Mobile OTP.
  2. **Exclusivity Window**: The unlock grants a 24-hour exclusive window with legal contact rights.

---

### Stream 5: Investor (Referral Partner) Onboarding Bonus
* **Annual Investor Membership**: **₹20,000** / year
* **Partner Earning**: **10% flat = ₹2,000**
* **Company Share**: **90% = ₹18,000**
* **Ledger Head**: `REGISTRATION_REFERRAL`
* **How It Works**:
  When an agent onboards a capital investor who registers at `/register/investor` and pays the ₹20,000 annual platform fee, ₹2,000 is credited directly to the referring agent upon Admin payment verification.
* **Limitations & Niyam**:
  1. **Agent Code Mapping**: The investor must enter the referring partner's Agent Code during registration.
  2. **Validity**: The registration fee provides 365 days of active platform investment access.
  3. **Future Profit Hook**: Onboarding an investor permanently links them to the agent for downstream Joint Venture profit splits (Stream 8).

---

### Stream 6: Buyer-Side Property Sale Brokerage (1%)
* **Rate**: **1% of Total Sale Deal / Registry Value**
* **Category**: B2B Deals
* **Company Cut**: **0% (Zero deduction)** — 100% of the 1% goes to the Agent
* **Ledger Head**: `BROKERAGE`
* **How It Works**:
  When a Channel Partner brings the Buyer and successfully closes a sale on any platform property, 1% of the total deal value is disbursed to the buyer-side agent.
* **Limitations & Niyam**:
  1. **Buyer Mapping**: The partner must be mapped as the Buyer-Side Partner on the Deal Record in `/admin/deals`.
  2. **Anti-Bypass Protection**: Buyers are bound by the platform's electronic Anti-Bypass Deed for 12 months.
  3. **Instant Disbursal**: Credited to the wallet immediately when Admin records the deal.

---

### Stream 7: Seller-Side Property Sale Brokerage (1%)
* **Rate**: **1% of Total Sale Deal / Registry Value**
* **Category**: B2B Deals
* **Company Cut**: **0% (Zero deduction)** — 100% of the 1% goes to the Agent
* **Ledger Head**: `BROKERAGE`
* **How It Works**:
  When a Channel Partner lists or manages the Seller's inventory and the property sells, 1% of the total deal value is disbursed to the seller-side agent.
* **Dual Representation (Double Brokerage 2%)**:
  If the same Channel Partner brought both the Buyer AND listed the Property, they earn:
  $$\text{Buyer (1\%)} + \text{Seller (1\%)} = \mathbf{2\% \text{ Total Brokerage}}$$
  Example: On a ₹1,00,00,000 (1 Cr) deal, a dual partner earns **₹2,00,000** in their wallet.

---

### Stream 8: Joint Venture Deal Profit Share (35 / 10 / 55 Formula)
* **Profit Formula**:
  $$\mathbf{35\% \text{ (Investor)} + 10\% \text{ (Agent Code)} + 55\% \text{ (Company)} = 100\%}$$
* **Breakdown**:
  * **35%**: Credited to the Investor's portfolio as realized ROI (`InvestorLedgerEntry`).
  * **10%**: Credited to the referring Agent's wallet (`DEAL_PROFIT_SHARE`).
  * **55%**: Retained as Company Treasury net profit.
* **Multi-Investor & Multi-Agent Architecture**:
  1. **1 Agent ➔ Multiple Investors**: A partner can onboard unlimited investors. The agent receives 10% across all of their investors' deal profits.
  2. **1 Deal ➔ Multiple Investors**: When a property deal has multiple participating investors, the 35 / 10 / 55 split executes proportionately on each investor's allocated profit pool:
     * *Example*: On a ₹10,00,000 deal profit with two investors (60% and 40%):
       * Investor 1 (₹6L pool) ➔ ₹2,10,000 to Investor 1 (35%), ₹60,000 to Agent 1 (10%), ₹3,30,000 to Company (55%).
       * Investor 2 (₹4L pool) ➔ ₹1,40,000 to Investor 2 (35%), ₹40,000 to Agent 2 (10%), ₹2,20,000 to Company (55%).
       * Company receives exactly **₹5,50,000 (55%)**.

---

## Technical & Financial Ledger Mapping

| Ledger Type Enum | User Role Beneficiary | Payout Mechanism | TDS Applicable |
| :--- | :--- | :--- | :---: |
| `GOLD_SPLIT` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `REFERRAL_CUSTOMER_RENEWAL` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `AGENT_REFERRAL` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `UNLOCK_SPLIT` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `REGISTRATION_REFERRAL` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `BROKERAGE` (Buyer Side) | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `BROKERAGE` (Seller Side) | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `DEAL_PROFIT_SHARE` | Channel Partner | Wallet Credit | Yes (5% Sec 194H) |
| `INVESTOR_PROFIT` | Investor Partner | Portfolio Balance | Capital Gains / Bank Transfer |

---

*Certified & Locked into Platform Configuration: November 2026.*

