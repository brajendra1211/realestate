"use client";

import { useState } from "react";
import { updatePartnerCustomTargetAction, resetPartnerCycleAction } from "./actions";

type PartnerTargetData = {
  agentId: string;
  agentCode: string | null;
  userName: string;
  shopName: string | null;
  city: string | null;
  customTargetEnabled: boolean;
  cycleDays: number;
  targets: {
    properties: number;
    directAgents: number;
    investors: number;
  };
  achieved: {
    properties: number;
    directAgents: number;
    investors: number;
  };
  remaining: {
    properties: number;
    directAgents: number;
    investors: number;
  };
  percentages: {
    overall: number;
  };
};

export function PartnerTargetModal({
  partner,
  defaultTargets,
}: {
  partner: PartnerTargetData;
  defaultTargets: {
    days: number;
    properties: number;
    directAgents: number;
    investors: number;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [useCustom, setUseCustom] = useState(partner.customTargetEnabled);
  const [days, setDays] = useState(partner.cycleDays || defaultTargets.days);
  const [properties, setProperties] = useState(partner.targets.properties || defaultTargets.properties);
  const [subPartners, setSubPartners] = useState(partner.targets.directAgents || defaultTargets.directAgents);
  const [investors, setInvestors] = useState(partner.targets.investors || defaultTargets.investors);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
      >
        <span>⚙️</span>
        <span>Set Target</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                  Target Customization
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {partner.shopName ?? partner.userName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {partner.agentCode ? `Agent Code: ${partner.agentCode} • ` : ""}
                  {partner.city ?? "General Location"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Performance Snapshot */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs">
              <div className="flex justify-between font-bold text-slate-700 mb-2">
                <span>Current Cycle Status:</span>
                <span className="text-blue-700">{partner.percentages.overall}% Achieved</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                  <p className="text-slate-400 font-medium">Properties</p>
                  <p className="font-extrabold text-slate-900 mt-0.5">
                    {partner.achieved.properties} / {partner.targets.properties}
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                    Left: {partner.remaining.properties}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                  <p className="text-slate-400 font-medium">Partners</p>
                  <p className="font-extrabold text-slate-900 mt-0.5">
                    {partner.achieved.directAgents} / {partner.targets.directAgents}
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                    Left: {partner.remaining.directAgents}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                  <p className="text-slate-400 font-medium">Investors</p>
                  <p className="font-extrabold text-slate-900 mt-0.5">
                    {partner.achieved.investors} / {partner.targets.investors}
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                    Left: {partner.remaining.investors}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form action={updatePartnerCustomTargetAction} className="space-y-4">
              <input type="hidden" name="agentId" value={partner.agentId} />

              {/* Mode Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 bg-slate-50/50">
                <div>
                  <p className="text-xs font-bold text-slate-800">Custom Target Override</p>
                  <p className="text-[11px] text-slate-500">
                    {useCustom
                      ? "Custom numbers apply exclusively to this partner."
                      : "Using platform global default values."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                    className="sr-only peer"
                  />
                  <input type="hidden" name="customTargetEnabled" value={useCustom ? "true" : "false"} />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Target Fields */}
              <div className={`grid grid-cols-2 gap-3 transition-opacity ${useCustom ? "opacity-100" : "opacity-45 pointer-events-none"}`}>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Cycle Duration (Days)
                  </label>
                  <input
                    type="number"
                    name="cycleDaysTarget"
                    min="1"
                    max="365"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Properties to List
                  </label>
                  <input
                    type="number"
                    name="cycleCustomerPropertiesTarget"
                    min="1"
                    value={properties}
                    onChange={(e) => setProperties(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Downline Partners to Add
                  </label>
                  <input
                    type="number"
                    name="cycleDirectAgentsTarget"
                    min="0"
                    value={subPartners}
                    onChange={(e) => setSubPartners(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Investors to Onboard
                  </label>
                  <input
                    type="number"
                    name="cycleInvestorsTarget"
                    min="0"
                    value={investors}
                    onChange={(e) => setInvestors(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-sm cursor-pointer"
                >
                  Save Partner Targets
                </button>
              </div>
            </form>

            {/* Cycle Reset Action */}
            <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Restart 30-day countdown from today</span>
              <form action={resetPartnerCycleAction}>
                <input type="hidden" name="agentId" value={partner.agentId} />
                <button
                  type="submit"
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                >
                  Restart Target Cycle ↻
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
