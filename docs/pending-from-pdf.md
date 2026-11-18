# PDF (Company Update) — jo abhi NAHI hua hai

Date: 17 Nov 2026. Baaki sab website par ban chuka hai (dekho `pdf-requirements-audit.md` + is session ka kaam).

## 1. Bahar ki service / keys chahiye (code se pehle account chahiye)

| # | PDF point | Kya chahiye | Abhi kya hai |
|---|---|---|---|
| 60, 61, 70 | Exotel virtual masked calling (customer/agent/staff ke number hide) | Exotel account + API key + virtual number | Sirf simple `tel:` call button |
| 64, 65, 68, 71 | WhatsApp messages: payment ke baad "no response" alert, Split Agent alert, Rent/Sell/Letout confirmation, Buy confirmation | WhatsApp Business me 4 templates Meta se approve karwane honge | Sirf OTP template chalta hai. Buy confirmation abhi normal SMS/notification se jaata hai |
| 28 | Google Calendar integration | Google Cloud project + Calendar API OAuth | 2 ghante pehle reminder ka code hai (Redis queue par), Google Calendar nahi |
| 25 | Google Places API se nearby amenities | Google Maps API key (paid) | Free OpenStreetMap se chal raha hai |

## 2. Technical kaam jo baaki hai

| # | PDF point | Kya baaki hai |
|---|---|---|
| 27 | Agent-to-agent chat AES-256 encryption | Chat abhi plain save hota hai. Server-side encryption lagani hai |
| 33, 34, 39 | 1 minute me agent accept na kare to lead agle batch ko auto jaaye | Code hai, par Redis (BullMQ) chalu hona zaroori hai. Local me Redis nahi hai, production me set karna hai |
| 64 | 5 minute me koi agent response na de to customer ko alert + re-route | Template (upar) + 5-min timer baaki |
| 74 | Reward income highest/lowest agents ko ek click me wallet credit + "Congratulations" msg | Formula clear nahi, banana baaki |
| 75 | Target achieve na hone par auto message | Targets/warning hain, par auto WhatsApp/push message baaki |
| 12 | Customer ke ₹100 search par AI auto-matching engine | PDF me point adhura hai, kuch bana nahi |
| 24 | "Top 3 recommended societies" customer ko dikhana | Society dropdown hai, "Top 3 recommended" nahi |

## 3. Mobile App (Flutter, `mobile/` folder) — website ke naye features app me nahi hain

- Owner request ka buzzer + accept
- Buyer lead ka buzzer + accept (multi-partner)
- Partner ka "My listings link" (shop link) share karna
- Naya buyer requirement form (Rent/Buy/Sell/Letout dropdowns) + buzzer limits ke error messages
- Support & disputes page, Terms accept popup
- Partners/commission naye screens
- Buy ke Penthouse / Duplex / Apartment
- Properties page ke Buy / Rent / Commercial / PG alag-alag modes
- Agent profile me Meta channel link

(App ke API endpoints website par ready hain; app me screens banana baaki hai.)

## 4. Client se poochna hai (PDF me samajh nahi aaya)

1. Point 1: "Area wise kya payment mode rakh sakte hain" — matlab?
2. Point 12: "AI past searches analyze karke…" — aage kya?
3. Point 39: "Ola-Uber ki tarah agent hire" — buzzer se alag kya naya?
4. Point 34: "30 din ya 7 din" — kaun sa? (abhi 7 din maana hai)
5. Point 63: "King of Ghaziabad ko har baar buzzer" — top agents ko hamesha pehle buzzer?
6. Point 74: reward kisko, kitna, kis formula se?
7. Point 25: Google Places (paid) ya OpenStreetMap (free)?
8. T&C ke saath "Meta channel link" — WhatsApp channel ka link chahiye ya kuch aur?

## 5. Production se pehle (launch checklist)

- 5 migrations production DB par chalani hain: `20261115120000`, `20261116120000`, `20261116130000`, `20261117120000`, `20261117130000`
- `.env` me `AUTH_TRUST_HOST`, `AUTH_URL`, `AUTH_SECRET`, Razorpay keys, Redis/Socket.io set karna
- `src/auth.ts` ka demo-password fallback hatana
- `scripts/update-admin.ts` me hardcoded admin password hai — repo me mat daalna
- Admin overview ka hardcoded 10/35/55 theek karna
