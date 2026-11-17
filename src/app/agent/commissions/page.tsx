import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { formatINR } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";

// Dynamic commission structure definitions with their rules & limitations
export type CommissionRule = {
  id: string;
  number: number;
  title: string;
  category: string;
  rate: string;
  rateDescription: string;
  howItWorks: string;
  limitations: string[];
  status: "ACTIVE" | "UPDATING";
  badgeColor: string;
};

export default async function AgentCommissionsPage() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const [settings, { entries, totals }] = await Promise.all([
    getSiteSettings(),
    getAgentCommissionSummary(agent.id),
  ]);

  // Current active commissions arranged in logical flow
  const commissionRules: CommissionRule[] = [
    {
      id: "GOLD_SPLIT",
      number: 1,
      title: "Property Listing Plans (₹300 & ₹500 Plans) — 50% Split",
      category: "Inventory Facilitation",
      rate: "50%",
      rateDescription: `₹150 on Basic Plan (₹${settings.basicListingFee}) · ₹250 on Gold Plan (₹${settings.goldListingFee})`,
      howItWorks:
        `Jab koi property owner aapke Channel Partner Code ke under pehli baar property list karta hai, toh 2 official plans available hain: ₹${settings.basicListingFee} (1 Month) ya ₹${settings.goldListingFee} (3 Months Gold). Dono me se kisi bhi plan purchase par 50% onboarding commission instant aapke partner wallet me credit hota hai.`,
      limitations: [
        `Basic Listing Plan (₹${settings.basicListingFee}): Property 30 din (1 Month) active rehti hai. Partner wallet me ₹150 credit hota hai aur ₹150 company treasury me jata hai.`,
        `Gold Listing Plan (₹${settings.goldListingFee}): Property 90 din (3 Months) verified priority tag ke sath active rehti hai. Partner wallet me ₹250 credit hota hai aur ₹250 company treasury me jata hai.`,
        "Mapping Rule: Property listing form par aapka Channel Partner Code linked hona ya aapke portal se post hona zaroori hai.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      id: "REFERRAL_CUSTOMER_RENEWAL",
      number: 2,
      title: "Property Renewal Royalty Income (50% Repeat Split)",
      category: "Passive Royalty Stream",
      rate: "50%",
      rateDescription: `₹150 on Basic Renewal (₹${settings.basicListingFee}) · ₹250 on Gold Renewal (₹${settings.goldListingFee})`,
      howItWorks:
        `Ek baar jab aap kisi property ko platform par list karwate hain, toh us property ki validity (30 din Basic / 90 din Gold) khatam hone ke baad, jab bhi owner us listing ko dobara renew ya relist karta hai, har baar renewal fee ka 50% royalty commission (₹150 ya ₹250) aapke wallet me automatically credit hota hai.`,
      limitations: [
        "Perpetual Mapping: Jab tak property aapke Agent Code se mapped hai, har renewal cycle par 50% recurring royalty milti rahegi.",
        `Basic Plan Renewal: Har 30 din baad jab owner ₹${settings.basicListingFee} pay karega, ₹150 instant agent wallet me aur ₹150 company treasury me jayega.`,
        `Gold Plan Renewal: Har 90 din baad jab owner ₹${settings.goldListingFee} pay karega, ₹250 instant agent wallet me aur ₹250 company treasury me jayega.`,
        "Zero Effort Passive Income: Is renewal commission ke liye agent ko dobara property upload ya naya paperwork nahi karna padta; owner ke self-renewal se royalty real-time trigger hoti hai.",
        "Audit Ledger: Ye earnings aapke transaction ledger me 'REFERRAL_CUSTOMER_RENEWAL' head ke under add hoti hain.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      id: "AGENT_REFERRAL",
      number: 3,
      title: "Partner-to-Partner Onboarding (₹1,000 & ₹2,000 Plans) — 50% Split",
      category: "Channel Network",
      rate: "50%",
      rateDescription: `₹500 on Basic Plan (₹${settings.agentBasicPlanPrice}) · ₹1,000 on Prime Plan (₹${settings.agentPrimePlanPrice})`,
      howItWorks:
        `Jab aap kisi dusre naye Channel Partner (Agent) ko apne referral link ya Agent Code se onboard karte hain, aur woh apna partner membership plan purchase karta hai (₹${settings.agentBasicPlanPrice} Basic ya ₹${settings.agentPrimePlanPrice} Prime), toh plan amount ka 50% instant aapke wallet me credit hota hai aur 50% company ke paas jata hai.`,
      limitations: [
        `Basic Partner Plan (₹${settings.agentBasicPlanPrice}): Naya agent 10 properties limit ke sath onboard hota hai. Referring partner ko 50% (₹500) milta hai aur ₹500 company treasury me jata hai.`,
        `Prime Partner Plan (₹${settings.agentPrimePlanPrice}): Naya agent unlimited properties listing aur priority direct leads ke sath onboard hota hai. Referring partner ko 50% (₹1,000) milta hai aur ₹1,000 company treasury me jata hai.`,
        "Mapping Rule: Naye agent ke registration ke time aapka Agent Code (e.g. NP-1001) mapped hona anivarya hai.",
        "Payout Trigger: Naye partner ki ID aur plan payment Admin Console se verify/activate hote hi instant wallet me credit trigger hota hai.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    },
    {
      id: "UNLOCK_SPLIT",
      number: 4,
      title: "Property Full Detail & Contact Unlock Pass (₹100) — 50-50 Split",
      category: "Customer Leads",
      rate: "50%",
      rateDescription: `₹50 per Unlock Pass via Agent Code (Pass MRP: ₹${settings.unlockPassAmount})`,
      howItWorks:
        `Website par public view me property ka sirf upar ka preview card (photos, price, basic overview) dikhta hai, andar ki main private info (exact unit address, owner contact, floor details) locked rehti hai. Pura data unlock karne ke liye ₹${settings.unlockPassAmount} ka pass lagta hai. Agar customer direct bina agent ke unlock karega toh 100% (₹100) company ke paas jata hai. Lekin agar customer aapke Agent Code ke through unlock karta hai ya aap customer ko dikhate hain, toh 50% (₹50) instant aapke wallet me credit hota hai aur ₹50 company ke paas jata hai.`,
      limitations: [
        "Customer Verification: Is 50-50 split ke liye Buyer/Customer ko apna Name, Mobile Number, aur aapka Agent Code (e.g. NP-1001) daalna hota hai aur Mobile OTP se verify karna hota hai.",
        "Direct vs Agent Split: Agar customer bina kisi Agent Code ke direct website se unlock karta hai toh ₹100 pura 100% company treasury me jata hai (zero partner credit).",
        "Agent Assisted View: Agar agent khud apne customer ko property dikhane ke liye unlock kare ya customer se agent code daal kar unlock karwaye, toh instant ₹50 agent wallet me aur ₹50 company me divide hota hai.",
        "Instant Credit: Jaise hi customer ka OTP verify aur ₹100 payment confirm hoga, ₹50 real-time aapke wallet me add ho jayega.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      id: "REGISTRATION_REFERRAL",
      number: 5,
      title: "Investor Onboarding Bonus (10% of ₹20,000 Fee)",
      category: "Investor Network",
      rate: "₹2,000",
      rateDescription: `${settings.investorReferralPercent}% of Annual Registration Fee (₹${settings.investorRegistrationFee.toLocaleString("en-IN")})`,
      howItWorks:
        `Jab aap kisi naye Investor (Referral Partner) ko platform par onboard karte hain aur woh apna ₹${settings.investorRegistrationFee.toLocaleString("en-IN")}/year annual membership fee pay karta hai, toh 10% (₹2,000) instant aapke Channel Partner wallet me credit hota hai aur baaki ₹18,000 (90%) company treasury ke paas jata hai.`,
      limitations: [
        "Agent Code Linkage: Investor ke onboarding / registration form par aapka Channel Partner Code (e.g. NP-1001) mapped hona anivarya hai.",
        "Split Structure: Total ₹20,000 me se 10% (₹2,000) Referring Agent ko milta hai aur 90% (₹18,000) Company Treasury me jata hai.",
        "Verification Trigger: Investor dwara kiye gaye payment (Online / Bank Transfer) ki Admin Console se verification complete hote hi wallet me ₹2,000 credit hota hai.",
        "Double Benefit Hook: Is ₹2,000 onboarding bonus ke alawa, aage chalkar yeh investor jab bhi kisi property flip deal me invest karega, toh us deal ke realized profit ka 10% bhi aapko alag se milega.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
      id: "BUYER_BROKERAGE",
      number: 6,
      title: "Buyer-Side Property Sale Brokerage (1%)",
      category: "B2B Deals",
      rate: `${settings.brokeragePercent}%`,
      rateDescription: "1% of Total Sale Deal / Registry Value",
      howItWorks:
        "Jab aap Buyer (Kharidaar) ko represent karte hain aur platform par available kisi bhi verified seller/property ki deal successfully close karate hain, toh total deal amount ka 1% sidhe aapke partner wallet me credit hota hai (Zero company deduction).",
      limitations: [
        "Buyer Representation: Deal create karte waqt aap Buyer-Side Channel Partner ke roop me mapped hone chahiye.",
        "Zero Company Deduction: Is 1% brokerage me company ka zero cut hota hai — poora 100% agent ke wallet me jata hai.",
        "Anti-Bypass Protection: Platform ke Anti-Bypass agreement ke tehat Buyer 12 mahine ke liye aapke code se locked rehta hai taaki deal offline bypass na ho sake.",
        "Payout Trigger: Registry ya sale agreement close hone par Admin Console se deal execute hote hi wallet me balance add ho jata hai.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "SELLER_BROKERAGE",
      number: 7,
      title: "Seller-Side Property Sale Brokerage (1%)",
      category: "B2B Deals",
      rate: `${settings.brokeragePercent}%`,
      rateDescription: "1% of Total Sale Deal / Registry Value",
      howItWorks:
        "Jab aap Seller / Property Owner ki inventory ko represent karte hain aur us property ki sale deal platform par close hoti hai, toh total deal / registry amount ka 1% sidhe aapke partner wallet me credit hota hai.",
      limitations: [
        "Seller Representation: Deal execute karte waqt aap Seller-Side Channel Partner ke roop me mapped hone chahiye.",
        "Dual Representation (Double 2% Earning): Agar aap hi Buyer laye hain aur aap hi Seller ko represent kar rahe hain, toh aapko Buyer 1% + Seller 1% = Poora 2% akele aapke wallet me credit hoga!",
        "Zero Company Deduction: Seller-side brokerage me se bhi company koi commission nahi kaat-ti (100% to agent).",
        "Payout Trigger: Deal closed mark hote hi instant real-time wallet credit.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    {
      id: "DEAL_PROFIT_SHARE",
      number: 8,
      title: "Joint Venture Deal Profit Share (10% via Agent Code)",
      category: "Investor Network",
      rate: `${settings.profitAgentSharePercent}%`,
      rateDescription: `10% of Deal Net Profit (Formula: 35% Investor / 10% Agent / 55% Company)`,
      howItWorks:
        `Jab company kisi property ko buy/renovate karke flip karti hai, toh banne wale total net profit ka 35% Investor ko milta hai, 10% unke referring Agent (Agent Code) ke wallet me jata hai, aur baaki poora 55% company ke paas rehta hai. Agar kisi deal me multiple investors shamil hain, toh har investor ke proportionate hisse par yehi 35/10/55 formula lagta hai.`,
      limitations: [
        "Agent Code Linkage: Investor aapke Channel Partner Code ke through registered hona zaroori hai.",
        "Split Formula (35 / 10 / 55): Har deal profit me se 35% Investor ko, 10% Referring Agent ko, aur baaki poora 55% Company ke paas ek hi jagah rehta hai.",
        "Multiple Investors & Multiple Agents: Ek deal me multiple investors invest kar sakte hain. Har investor ke proportionate profit me se unke respective agent ko 10% credit hoga. Ek agent ke multiple investors hone par un sabhi ka 10% us akele agent ke wallet me consolidate hoga.",
        "Payout Event: Payout tabhi trigger hota hai jab property registry/deed complete hokar final profit realize ho jaye.",
      ],
      status: "ACTIVE",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  const totalEarned = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/agent/dashboard" className="text-xs font-bold text-blue-600 hover:underline">
              ← Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Commission Structure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Commissions &amp; Earnings Rules
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Aapke Channel Partner account se jude sabhi commission streams, unke rates, working method aur limitations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/agent/payments"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
          >
            <span>💳 Request Payout →</span>
          </Link>
        </div>
      </div>

      {/* 2. Live Earnings Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Available Wallet Balance
          </span>
          <p className="mt-2 text-3xl font-black text-emerald-700 tracking-tight">
            {formatINR(agent.walletBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Bank withdrawal ready (Net 5% TDS)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Commissions Earned
          </span>
          <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
            {formatINR(totalEarned)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{entries.length} recorded credit transactions</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Commission Streams
          </span>
          <p className="mt-2 text-3xl font-black text-blue-700 tracking-tight">
            {commissionRules.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Configured and verified rules</p>
        </div>
      </div>

      {/* 3. Section Title */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          Commission Rules &amp; Limitations Breakdown
        </h2>
        <p className="text-xs text-slate-500">
          Niche diye gaye har card me commission ka purpose, earning rate aur uski exact shartein (limitations) di gayi hain:
        </p>
      </div>

      {/* 4. Commission Stream Cards List */}
      <div className="space-y-6">
        {commissionRules.map((rule) => {
          let earnedInThisCategory = totals[rule.id] ?? 0;
          if (rule.id === "BUYER_BROKERAGE") {
            earnedInThisCategory = entries
              .filter((e) => e.type === "BROKERAGE" && (e.note?.toLowerCase().includes("buyer") || !e.note?.toLowerCase().includes("seller")))
              .reduce((sum, e) => sum + e.amount, 0);
          } else if (rule.id === "SELLER_BROKERAGE") {
            earnedInThisCategory = entries
              .filter((e) => e.type === "BROKERAGE" && e.note?.toLowerCase().includes("seller"))
              .reduce((sum, e) => sum + e.amount, 0);
          }

          return (
            <div
              key={rule.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm">
                    {rule.number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-base text-slate-900">{rule.title}</h3>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${rule.badgeColor}`}>
                        {rule.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {rule.rateDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-start sm:self-auto">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Aapki Earning
                    </span>
                    <span className="font-black text-base text-emerald-700">
                      +{formatINR(earnedInThisCategory)}
                    </span>
                  </div>
                  <span className="rounded-xl bg-slate-50 px-3 py-1.5 font-mono text-sm font-black text-slate-900 border border-slate-200">
                    {rule.rate}
                  </span>
                </div>
              </div>

              {/* Working details */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                    ℹ️ Yeh Commission Kaise Kaam Karta Hai (How It Works):
                  </span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {rule.howItWorks}
                  </p>
                </div>

                {/* Limitations */}
                <div>
                  <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] block mb-1">
                    ⚠️ Limitations &amp; Niyam (Shartein):
                  </span>
                  <ul className="space-y-1.5 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 text-slate-700">
                    {rule.limitations.map((limit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Live Credit Audit Trail */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Recent Commission Credit History
          </h2>
          <Link href="/agent/payments" className="text-xs font-semibold text-blue-600 hover:underline">
            View All in Payments →
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
            Abhi tak koi commission credit record nahi hua hai. Jab aapki deal ya referral close hoga, yahan live update hoga.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Commission Type</th>
                  <th className="px-4 py-3">Transaction Note</th>
                  <th className="px-4 py-3 text-right">Amount Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.slice(0, 5).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {entry.createdAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {entry.type}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 truncate max-w-xs">
                      {entry.note ?? "Commission Credit"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-emerald-700 whitespace-nowrap">
                      +{formatINR(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

