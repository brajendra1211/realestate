# Platform flow: panels, roles, paisa

Ye document project ka "ek jagah" map hai. Pehle yahi sahi karo, phir code ko is par align karo.
Jo cheez code se verify nahi hui wo **(verify)** likhi hai.

## 1. Roles aur panels

| Role | Panel | Web | Mobile | Ek line mein kaam |
|---|---|---|---|---|
| BUYER (customer) | Customer | `/buyer/*`, `/listings`, `/properties`, `/cart` | haan | property dhundna, cart, requirement, visit, rating |
| OWNER | Owner | `/dashboard/*` | haan | apni property ke liye partner ko request, plan |
| AGENT (channel partner) | Agent | `/agent/*` | haan | listing, leads, wallet, requirements, office visit status |
| INVESTOR (referral partner) | Investor | `/investor/*` | haan | joining fee, ledger, profit, documents |
| SUBADMIN | Staff / Reception | `/admin/*` (limited) | nahi | buy-leads desk, office visit entry, support |
| ADMIN | Admin | `/admin/*` | nahi | sab kuch: approvals, payouts, settings, reports |

Dealer role hata diya gaya hai. Developer / Project sirf admin ke content hain (role nahi).

## 2. Panel kaise jude hain

```
Customer (BUYER)
  |-- search / listing dekhta hai ------------------------------+
  |-- Unlock (Rs 100) ----> Agent ko 50%, company ko 50%        |
  |-- Dispatch (Rs 100) --> nearby agents (1/3/5 km cascade)    |
  |        |-- koi nahi mila --> WATCH-LIST (requirement save)  |
  |-- Cart --> Share link / Send to Agent (agent code)          |
  |-- Visit OTP --> PropertyVisitLog --> Agent ko 50% income    |
  |-- Rating (1-5 star) --> Agent score, 5-star bonus           |
                                                                v
Agent  <---- watch match / dispatch / cart / buyer-interest ---- Matching engine
  |-- Listing banata hai (Basic Rs 299 / Gold Rs 499) --> approval --> live --> match check
  |-- Naya agent join karwata hai --> 50% split
  |-- Investor join karwata hai --> 10% of Rs 20,000
  |-- Deal (buy/sale) --> 1% brokerage each side
  |-- Wallet --> Payout request --> Admin approve --> TDS 5%
  '-- Office visit status (Reception ne mark kiya)

Investor
  |-- Rs 20,000 joining fee --> referring agent ko 10%
  '-- Deal profit: agent 10% / investor 35% / company 55%

Reception (SUBADMIN)
  '-- Agent code daalo --> Office visit Yes/No + saath aaye log (naam, mobile, relation, interest)
        --> Admin ke database mein + Agent ke dashboard par "last visit"

Admin
  '-- Sab ke upar: approvals (listing, gold, KYC, payout), settings (rates), reports, support
```

## 3. Paisa ka flow (sabse zaroori)

Rates `SiteSettings` se aate hain, admin badal sakta hai.

| Income | Kab | Rate (default) | Kisko |
|---|---|---|---|
| Listing fee | Agent listing banata hai | Basic Rs 299 / Gold Rs 499 | 50% agent wallet |
| Unlock pass | Customer contact unlock | Rs 100 | 50% listing agent |
| Dispatch | Customer requirement bhejta hai | Rs 100 | 50% accepting agent |
| Agent joining | Referred agent ka plan | Basic Rs 999 / Prime Rs 1999 | 50% referrer |
| Investor joining | Investor registration | Rs 20,000 | 10% referring agent |
| Brokerage | Buy / sale deal | 1% har side | agent |
| Profit share | Deal profit | agent 10% / investor 35% / company 55% | split |
| Renewal royalty | Customer renewal | `REFERRAL_CUSTOMER_RENEWAL` | referrer |
| 5-star bonus | 5-star rating | `COMPANY_FIVE_STAR_REWARD` | agent |
| Payout | Wallet se nikalna | TDS 5% | agent |

Auto vs manual: `manualCommissionTypes` mein jo type likha ho, wo admin haath se credit karta hai.

## 4. End-to-end flows (jinhe test karna hai)

1. **Agent onboarding**: register (WhatsApp OTP) -> KYC docs -> admin verify -> plan payment -> agent code.
2. **Listing**: agent listing banata hai -> fee split -> approval -> live -> watch-list match.
3. **Customer unlock**: customer login -> listing -> unlock -> agent ko notify.
4. **Visit OTP**: agent customer ke paas -> OTP -> visit log -> income.
5. **Requirement / dispatch**: customer requirement -> batches -> accept ya expire -> watch-list.
6. **Watch match**: naya listing live -> radius/BHK/budget match -> customer + agent ko message.
7. **Cart**: add -> share link ya send to agent -> agent ko notification.
8. **Office visit**: reception agent code daalta hai -> visit + visitors -> admin + agent dashboard.
9. **Deal**: deal create -> brokerage + profit split -> ledger.
10. **Payout**: agent request -> admin approve -> TDS -> paid.
11. **Investor**: registration fee -> ledger -> profit distribution.
12. **Rating + 3-strike**: rating -> score; 3 complaints -> warning.

## 5. Abhi ke confusion points
- Do listing tables: `Property` (website) aur `AgentListing` (partner). Dono alag chalte hain.
- Same kaam web server actions aur API routes dono mein.
- Admin ke 49 pages.
- Tests nahi.

## 6. Best approach: panel-by-panel, test-first

Har panel ke liye ek hi chakra: **likho -> test likho -> cleanup -> UI**. Ek panel khatam hone par hi agla.

| Step | Panel | Kyun is order mein |
|---|---|---|
| 0 | Setup: Vitest, Playwright, test DB, seed | sab ki neev |
| 1 | **Money core** (`commission`, `payout`, `deal`, `unlock`) | galti sabse mehngi; baaki sab isi par tike |
| 2 | **Agent** | sabse zyada kaam, sabse zyada paisa |
| 3 | **Customer** | agent se juda hua (unlock, dispatch, cart, watch) |
| 4 | **Admin + Reception** | approvals aur reports upar se |
| 5 | **Investor + Owner** | chhote panel |
| 6 | Listing tables ek karna | sabse risky, last mein |

Har panel ke liye "done" ka matlab: flow likha hua, unit + API permission + ek E2E test pass, web aur mobile ek jaise.

## 7. Testing matrix

| Tarika | Tool | Kya |
|---|---|---|
| Unit | Vitest | paise aur matching ka logic |
| API permission | Vitest + fetch | har route par har role: allowed / forbidden |
| E2E web | Playwright | section 4 ke flows |
| Mobile | Flutter widget + integration_test | wahi flows emulator par |
| Manual | role-wise checklist | UI aur shabd |
| Staging | alag server + alag DB | deploy se pehle dry run |
