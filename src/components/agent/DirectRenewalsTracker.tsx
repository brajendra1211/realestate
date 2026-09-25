"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";

type DirectAgentItem = {
  id: string;
  agentCode: string;
  name: string;
  phone: string;
  whatsapp: string;
  joinedAt: Date;
  renewalDate: Date;
  daysToRenewal: number;
  isExpired: boolean;
  planTier: string;
  primeStatus: boolean;
};

type DirectListingItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  masterId: string;
  listingPlan: string;
  expiresAt: Date;
  daysToExpiry: number;
  isExpired: boolean;
  agreementExpiryDate: Date | null;
};

type DirectRenewalsProps = {
  agents: DirectAgentItem[];
  listings: DirectListingItem[];
};

export function DirectRenewalsTracker({ agents, listings }: DirectRenewalsProps) {
  const [tab, setTab] = useState<"agents" | "properties">("agents");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            🔔 Direct Network & Renewals Follow-up Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Apne direct agents aur customer properties ka renewal track karein aur unhe Call/WhatsApp karke renew karwayein.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("agents")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === "agents" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Direct Channel Partners ({agents.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("properties")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === "properties" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Customer Properties ({listings.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Direct Channel Partners */}
      {tab === "agents" && (
        <div className="mt-4">
          {agents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              Aapke direct referral link se abhi koi channel partner join nahi hua hai. Share your channel partner referral link to earn 10% referral income!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Channel Partner Code & Name</th>
                    <th className="py-2.5 px-3">Joining Date</th>
                    <th className="py-2.5 px-3">Renewal Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Renewal Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-600">{agent.agentCode}</span>
                          {agent.primeStatus && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                              Prime
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900 mt-0.5">{agent.name}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {new Date(agent.joinedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">
                          {new Date(agent.renewalDate).toLocaleDateString("en-IN")}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            agent.daysToRenewal <= 0
                              ? "text-red-600"
                              : agent.daysToRenewal <= 7
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {agent.daysToRenewal <= 0
                            ? "Expired / Due Now"
                            : `${agent.daysToRenewal} days left`}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            agent.isExpired
                              ? "bg-red-100 text-red-700"
                              : agent.daysToRenewal <= 7
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {agent.isExpired ? "Needs Renewal" : "Active"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {agent.phone && (
                            <a
                              href={`tel:${agent.phone}`}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 transition"
                              title={`Call ${agent.name}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                          )}
                          {agent.whatsapp && (
                            <a
                              href={`https://wa.me/91${agent.whatsapp.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                                `Namaste ${agent.name} ji! Aapka BayaEstate Channel Partner Code (${agent.agentCode}) ka renewal due hai. Kripya apna renewal time par kar lein taaki aapki property feed aur leads active rahein.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#20ba59] transition"
                            >
                              💬 Remind Renewal
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customer Properties */}
      {tab === "properties" && (
        <div className="mt-4">
          {listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              Aapki koi active property listing nahi hai. Add new properties to track renewals!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Property Title & Code</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Listing Expiry Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {item.masterId} · {formatINR(item.price)}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {item.listingPlan}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">
                          {new Date(item.expiresAt).toLocaleDateString("en-IN")}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            item.daysToExpiry <= 0
                              ? "text-red-600"
                              : item.daysToExpiry <= 7
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {item.daysToExpiry <= 0 ? "Expired (Delisted)" : `${item.daysToExpiry} days left`}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.isExpired
                              ? "bg-red-100 text-red-700"
                              : item.daysToExpiry <= 7
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.isExpired ? "Delisted / Due" : "Live"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href={`/listings/${item.slug}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View / Re-list
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
