"use client";

import { useState } from "react";
import Link from "next/link";

export type ListingItem = {
  id: string;
  title: string;
  slug: string;
  price: number;
  listingType: string;
  propertyType: string;
  locality: string | null;
  city: string;
  source: "MARKETPLACE" | "PORTAL";
  plan: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  inCycle: boolean;
  url: string;
  thumbnail: string | null;
};

export type DownlineAgentItem = {
  id: string;
  agentCode: string | null;
  name: string;
  shopName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  planTier: string;
  primeStatus: boolean;
  status: string;
  createdAt: string;
  inCycle: boolean;
};

export type InvestorItem = {
  id: string;
  investorCode: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  feeStatus: string;
  registrationFee: number;
  totalCapitalInvested: number;
  createdAt: string;
  inCycle: boolean;
};

export type PartnerBreakdownData = {
  agentId: string;
  agentCode: string | null;
  userName: string;
  userPhone: string | null;
  userWhatsapp?: string | null;
  userEmail: string | null;
  shopName: string | null;
  shopAddress: string | null;
  alternatePhone: string | null;
  city: string | null;
  yearsExperience: number | null;
  staffCount: number | null;
  reraNumber: string | null;
  gstNumber: string | null;
  walletBalance: number;
  warningCount: number;
  ratingAvg: number | null;
  planTier: string;
  daysRemaining: number;
  cycleDays: number;
  cycleStartDate: Date;
  cycleEndDate: Date;
  achieved: {
    properties: number;
    directAgents: number;
    investors: number;
    deals: number;
    visits: number;
  };
  targets: {
    properties: number;
    directAgents: number;
    investors: number;
  };
  listingsList: ListingItem[];
  downlineAgentsList: DownlineAgentItem[];
  investorsList: InvestorItem[];
};

function formatInr(amount: number) {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lac`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PartnerBreakdownView({
  partner,
}: {
  partner: PartnerBreakdownData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "downline" | "investors" | "profile">("listings");
  const [listingsFilter, setListingsFilter] = useState<"all" | "cycle">("all");

  const listings = partner.listingsList || [];
  const downlineAgents = partner.downlineAgentsList || [];
  const investors = partner.investorsList || [];

  const filteredListings = listingsFilter === "cycle"
    ? listings.filter((l) => l.inCycle)
    : listings;

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      {/* Toggle button bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center justify-between sm:justify-start gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
            isOpen
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{isOpen ? "▲" : "▼"}</span>
            <span>
              {isOpen ? "Hide Detailed Breakdown" : "View Detailed Breakdown (Listings & Network)"}
            </span>
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              isOpen ? "bg-slate-800 text-blue-300" : "bg-white text-slate-700 shadow-2xs"
            }`}
          >
            {listings.length} Listings • {downlineAgents.length} Partners • {investors.length} Investors
          </span>
        </button>

        {/* Quick info chip */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
          <span>Wallet: {formatInr(partner.walletBalance)}</span>
          <span>•</span>
          <span>Rating: ⭐ {partner.ratingAvg ? partner.ratingAvg.toFixed(1) : "5.0"}</span>
          {partner.agentCode && (
            <>
              <span>•</span>
              <Link
                href={`/shop/${partner.agentCode}`}
                target="_blank"
                className="text-blue-600 hover:underline font-extrabold"
              >
                Public Shop ↗
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Expandable Content Container */}
      {isOpen && (
        <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 space-y-4 animate-fadeIn">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                activeTab === "listings"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>📑 Properties Listed</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "listings" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                {listings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("downline")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                activeTab === "downline"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>👥 Downline Partners</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "downline" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                {downlineAgents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("investors")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                activeTab === "investors"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>🤝 Referral Investors</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "investors" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                {investors.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>ℹ️ Profile & Baki Chiza</span>
            </button>
          </div>

          {/* TAB 1: LISTINGS */}
          {activeTab === "listings" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Properties Listed by {partner.userName} ({filteredListings.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Is partner ne kin-kin properties ki listing ki hai aur unka active status:
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <span className="text-slate-400">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setListingsFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      listingsFilter === "all" ? "bg-blue-100 text-blue-800 font-black" : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({listings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingsFilter("cycle")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      listingsFilter === "cycle" ? "bg-blue-100 text-blue-800 font-black" : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Current 30-Day Cycle ({listings.filter((l) => l.inCycle).length})
                  </button>
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  <span className="text-2xl block mb-1">🏠</span>
                  <p className="font-bold text-slate-700">Koi listing nahi mili</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {listingsFilter === "cycle"
                      ? "Is partner ne current 30-day cycle mein abhi tak koi property list nahi ki hai."
                      : "Is partner ke account se abhi koi property create ya list nahi hui hai."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredListings.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-blue-300 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-700">
                              {item.listingType} • {item.propertyType}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                item.plan === "GOLD"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {item.plan} Plan
                            </span>
                            {item.inCycle && (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                ✓ In Cycle
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-slate-900 line-clamp-1" title={item.title}>
                            {item.title}
                          </h5>

                          <p className="text-[11px] text-slate-500 truncate">
                            📍 {item.locality ? `${item.locality}, ` : ""}{item.city}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-blue-700">
                            {formatInr(item.price)}
                          </p>
                          <span
                            className={`inline-block mt-0.5 rounded-full px-2 py-0.2 text-[9px] font-black ${
                              item.status === "ACTIVE" || item.status === "APPROVED" || item.status === "AVAILABLE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "EXPIRED"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        <span>Listed: {formatDate(item.createdAt)}</span>
                        <Link
                          href={item.url}
                          target="_blank"
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Open Listing</span>
                          <span>↗</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOWNLINE PARTNERS */}
          {activeTab === "downline" && (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Downline Channel Partners Onboarded ({downlineAgents.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Is partner ke reference se kon kon channel partners platform se jude hain:
                </p>
              </div>

              {downlineAgents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  <span className="text-2xl block mb-1">👥</span>
                  <p className="font-bold text-slate-700">Koi Downline Partner nahi mila</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target: {partner.targets.directAgents} downline partners onboard karna.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {downlineAgents.map((subAgent) => (
                    <div
                      key={subAgent.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {subAgent.agentCode && (
                              <span className="rounded-md bg-indigo-50 font-mono text-[10px] font-black text-indigo-700 border border-indigo-200 px-1.5 py-0.5">
                                {subAgent.agentCode}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                subAgent.planTier === "PRIME"
                                  ? "bg-purple-100 text-purple-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {subAgent.planTier}
                            </span>
                            {subAgent.inCycle && (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                ✓ In Cycle
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-slate-900 truncate">
                            {subAgent.name}
                          </h5>
                          {subAgent.shopName && (
                            <p className="text-[11px] font-semibold text-slate-600 truncate">
                              🏪 {subAgent.shopName}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 truncate">
                            📍 {subAgent.city || "City not set"}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {subAgent.whatsapp && (
                            <a
                              href={`https://wa.me/${subAgent.whatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 text-[10px] font-black flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <span>💬 WhatsApp</span>
                            </a>
                          )}
                          {subAgent.phone && (
                            <a
                              href={`tel:${subAgent.phone}`}
                              className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 text-[10px] font-bold text-center"
                            >
                              📞 Call
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        <span>Joined: {formatDate(subAgent.createdAt)}</span>
                        {subAgent.agentCode && (
                          <Link
                            href={`/shop/${subAgent.agentCode}`}
                            target="_blank"
                            className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Partner Shop ↗
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVESTORS */}
          {activeTab === "investors" && (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Referral Investors Added ({investors.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Is partner ke reference se kon kon investors onboard hue hain:
                </p>
              </div>

              {investors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  <span className="text-2xl block mb-1">🤝</span>
                  <p className="font-bold text-slate-700">Koi Referral Investor nahi mila</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target: {partner.targets.investors} referral investors onboard karna.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {investors.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {inv.investorCode && (
                              <span className="rounded-md bg-emerald-50 font-mono text-[10px] font-black text-emerald-800 border border-emerald-200 px-1.5 py-0.5">
                                {inv.investorCode}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                inv.feeStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                  : "bg-amber-100 text-amber-900 border border-amber-200"
                              }`}
                            >
                              Fee: {inv.feeStatus}
                            </span>
                            {inv.inCycle && (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                ✓ In Cycle
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-slate-900 truncate">
                            {inv.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 truncate">
                            ✉️ {inv.email}
                          </p>
                          <p className="text-[11px] font-extrabold text-slate-700">
                            Capital Invested: {formatInr(inv.totalCapitalInvested)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {inv.whatsapp && (
                            <a
                              href={`https://wa.me/${inv.whatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 text-[10px] font-black flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <span>💬 WhatsApp</span>
                            </a>
                          )}
                          {inv.phone && (
                            <a
                              href={`tel:${inv.phone}`}
                              className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 text-[10px] font-bold text-center"
                            >
                              📞 Call
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        <span>Joined: {formatDate(inv.createdAt)}</span>
                        <span className="font-semibold text-slate-600">
                          Reg Fee: ₹{inv.registrationFee.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & BAKI SAB CHIZA */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Full Partner Profile & Business Details (Baki Sab Chiza)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Contact details, business address, RERA, wallet balance aur target cycle record:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Box 1: Contact & Identification */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Contact & Identification
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-bold text-slate-900">{partner.userName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Agent Code:</span>
                    <span className="font-mono font-bold text-blue-700">{partner.agentCode || "Not Assigned"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Primary Phone:</span>
                    <span className="font-bold text-slate-900">{partner.userPhone || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Alternate Phone:</span>
                    <span className="font-bold text-slate-900">{partner.alternatePhone || "None"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email Address:</span>
                    <span className="font-bold text-slate-900">{partner.userEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">City / Operating Area:</span>
                    <span className="font-bold text-slate-900">{partner.city || "N/A"}</span>
                  </div>
                </div>

                {/* Box 2: Shop & Business Info */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Shop & Legal Information
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Shop / Firm Name:</span>
                    <span className="font-bold text-slate-900">{partner.shopName || "N/A"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Shop Address:</span>
                    <span className="font-bold text-slate-900 text-right">{partner.shopAddress || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Experience:</span>
                    <span className="font-bold text-slate-900">{partner.yearsExperience ? `${partner.yearsExperience} Years` : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Staff Count:</span>
                    <span className="font-bold text-slate-900">{partner.staffCount ?? 0} members</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">RERA Registration:</span>
                    <span className="font-mono font-bold text-slate-900">{partner.reraNumber || "Not Provided"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">GST Number:</span>
                    <span className="font-mono font-bold text-slate-900">{partner.gstNumber || "Not Provided"}</span>
                  </div>
                </div>

                {/* Box 3: Wallet & Performance Stats */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Wallet & Platform Performance
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current Wallet Balance:</span>
                    <span className="font-black text-emerald-700">{formatInr(partner.walletBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-black text-blue-700">{partner.planTier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deals Closed (In Cycle):</span>
                    <span className="font-bold text-slate-900">{partner.achieved.deals} Deals</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Property Visits Done:</span>
                    <span className="font-bold text-slate-900">{partner.achieved.visits} Visits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Customer Rating:</span>
                    <span className="font-black text-amber-600">⭐ {partner.ratingAvg ? partner.ratingAvg.toFixed(1) : "5.0"} / 5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Platform Warnings:</span>
                    <span className={`font-black ${partner.warningCount > 0 ? "text-red-600" : "text-slate-700"}`}>
                      {partner.warningCount} Warnings
                    </span>
                  </div>
                </div>

                {/* Box 4: Target Cycle & Quick Actions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Target Cycle & Quick Contact
                  </span>
                  <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cycle Duration:</span>
                      <span className="font-bold text-slate-800">{partner.cycleDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cycle Started:</span>
                      <span className="font-bold text-slate-800">{formatDate(partner.cycleStartDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cycle Ends:</span>
                      <span className="font-bold text-slate-800">{formatDate(partner.cycleEndDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Days Left:</span>
                      <span className={`font-black ${partner.daysRemaining <= 7 ? "text-red-600" : "text-emerald-700"}`}>
                        {partner.daysRemaining} Days
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {partner.userPhone && (
                      <a
                        href={`tel:${partner.userPhone}`}
                        className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-center text-xs"
                      >
                        📞 Call Partner
                      </a>
                    )}
                    {(partner.userWhatsapp || partner.userPhone) && (
                      <a
                        href={`https://wa.me/${(partner.userWhatsapp || partner.userPhone || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 text-center text-xs"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    {partner.agentCode && (
                      <Link
                        href={`/shop/${partner.agentCode}`}
                        target="_blank"
                        className="w-full rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold py-2 text-center text-xs hover:bg-slate-50"
                      >
                        🏪 Open Agent Public Shop ↗
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
