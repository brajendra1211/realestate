"use client";

import { useState } from "react";

type AgentAssetProps = {
  agentCode: string;
  name: string;
  shopName: string | null;
  shopAddress: string | null;
  city: string | null;
  phone: string;
  alternatePhone?: string | null;
  whatsapp?: string | null;
  planTier: string;
  primeStatus: boolean;
  qrDataUrl: string;
  originUrl: string;
};

export function AgentAssetCards({
  agentCode,
  name,
  shopName,
  shopAddress,
  city,
  phone,
  alternatePhone,
  whatsapp,
  planTier,
  primeStatus,
  qrDataUrl,
  originUrl,
}: AgentAssetProps) {
  const [activeModal, setActiveModal] = useState<"qr" | "vcard" | "idcard" | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const effectiveWhatsapp = whatsapp || phone;
  const agentJoinUrl = `${originUrl}/register/agent?ref=${encodeURIComponent(agentCode)}`;
  const customerRentUrl = `${originUrl}/list-property/gold?ref=${encodeURIComponent(agentCode)}&listingType=RENT`;

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  }

  function shareVCardWhatsApp() {
    const text = `*REAL ESTATE CONSULTANT*\n*${name.toUpperCase()}*\nAgency: ${shopName || "BayaEstate Partner"}\nAgent Code: *${agentCode}*\n📞 Call: ${phone}${alternatePhone ? ` / ${alternatePhone}` : ""}\n💬 WhatsApp: ${effectiveWhatsapp}\n📍 Office: ${shopAddress || city || "Ghaziabad/NCR"}\n🔗 Verified Profile & Properties: ${originUrl}/listings?agentCode=${encodeURIComponent(agentCode)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareIdCardWhatsApp() {
    const text = `*OFFICIAL AUTHORIZED AGENT ID*\n*${name}* (Agent Code: *${agentCode}*)\nMembership: ${primeStatus ? "Verified Prime Partner" : "Registered Agent"}\nCity: ${city || "NCR"}\nPlatform: BayaEstate Certified Channel Partner\nVerify ID at: ${originUrl}/listings?agentCode=${encodeURIComponent(agentCode)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            💼 Agent Tools & Marketing Assets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Q-Code For Shop, Digital Visiting Card, Identity Card, and Referral Links.
          </p>
        </div>
      </div>

      {/* Grid of 4 Quick Tools */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Tool 1: Shop QR Code */}
        <button
          type="button"
          onClick={() => setActiveModal("qr")}
          className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <span className="mt-2.5 text-xs font-bold text-slate-800">QR-Code for Shop</span>
          <span className="text-[10px] text-slate-400">Scan & View Shop</span>
        </button>

        {/* Tool 2: Visiting Card */}
        <button
          type="button"
          onClick={() => setActiveModal("vcard")}
          className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 text-center transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="mt-2.5 text-xs font-bold text-slate-800">Visiting Card</span>
          <span className="text-[10px] text-slate-400">Share on WhatsApp</span>
        </button>

        {/* Tool 3: Identity Card */}
        <button
          type="button"
          onClick={() => setActiveModal("idcard")}
          className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 text-center transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
          <span className="mt-2.5 text-xs font-bold text-slate-800">Identity Card</span>
          <span className="text-[10px] text-slate-400">Official Agent ID</span>
        </button>

        {/* Tool 4: Referral Links Summary */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-left">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Direct Network</span>
            <p className="mt-1 text-xs font-bold text-slate-900">Referral Links</p>
            <p className="text-[10px] text-slate-600">Send to Agents & Rent Customers</p>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => copyToClipboard(agentJoinUrl, "agent")}
              className="flex-1 rounded-lg bg-amber-600 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-amber-700 transition text-center"
            >
              {copiedLink === "agent" ? "Copied!" : "Agent Link"}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(customerRentUrl, "rent")}
              className="flex-1 rounded-lg bg-slate-900 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-slate-800 transition text-center"
            >
              {copiedLink === "rent" ? "Copied!" : "Rent Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Referral Links Section with 1-Tap WhatsApp Share */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
        <h3 className="text-xs font-bold text-slate-800">🔗 Ready-to-Share Referral Links</h3>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Agent Join Link */}
          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-2.5 shadow-xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[11px] font-bold text-slate-900">New Agent Joining Link</p>
              <p className="truncate font-mono text-[10px] text-slate-500">{agentJoinUrl}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(agentJoinUrl, "agent_full")}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copiedLink === "agent_full" ? "✓ Copied" : "Copy"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Namaste! Join BayaEstate Verified Agent Network using my referral code *${agentCode}*: ${agentJoinUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#20ba59]"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Customer Add Rent Property Link */}
          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-2.5 shadow-xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[11px] font-bold text-slate-900">Customer Add Property (Only for Rent)</p>
              <p className="truncate font-mono text-[10px] text-slate-500">{customerRentUrl}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(customerRentUrl, "rent_full")}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copiedLink === "rent_full" ? "✓ Copied" : "Copy"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Apni property RENT par chadhane ke liye direct submit karein: ${customerRentUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#20ba59]"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL 1: Shop QR Code --- */}
      {activeModal === "qr" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
              Verified Agent Shop
            </span>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{shopName || name}</h3>
            <p className="font-mono text-xs text-blue-600 font-bold">{agentCode}</p>
            <p className="text-xs text-slate-500 mt-1">{shopAddress || city || "Ghaziabad/NCR"}</p>

            <div className="mt-5 mx-auto w-56 h-56 rounded-2xl border-4 border-slate-900 bg-white p-3 shadow-inner flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Agent Shop QR Code" className="w-full h-full object-contain" />
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Put this QR Code in your shop/office. Customers can scan to view all your properties instantly.
            </p>

            <div className="mt-5 flex gap-2">
              <a
                href={qrDataUrl}
                download={`Shop-QR-${agentCode}.svg`}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Download QR SVG
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Print Poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Digital Visiting Card --- */}
      {activeModal === "vcard" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Digital Visiting Card</h3>

            {/* Visiting Card Container */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl border border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                    BayaEstate Certified Partner
                  </span>
                  <h4 className="mt-1 text-xl font-black text-white">{name}</h4>
                  <p className="text-xs text-blue-200 font-medium">{shopName || "Real Estate Consultant"}</p>
                </div>
                <div className="w-16 h-16 rounded-xl bg-white p-1 shadow-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800 pt-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">Code:</span>
                  <span className="font-mono font-bold tracking-wide">{agentCode}</span>
                  {primeStatus && (
                    <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                      ★ Prime Tier
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span>📞 Call:</span>
                  <span className="font-semibold text-white">{phone}</span>
                  {alternatePhone && <span className="text-slate-400">/ {alternatePhone}</span>}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span>💬 WhatsApp:</span>
                  <span className="font-semibold text-emerald-400">{effectiveWhatsapp}</span>
                </div>
                {shopAddress && (
                  <div className="flex items-start gap-2 text-slate-400 text-[11px] pt-1">
                    <span>📍 Office:</span>
                    <span className="line-clamp-2">{shopAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={shareVCardWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white hover:bg-[#20ba59] transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm0 18.16c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.39 0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.25-8.24 8.25zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
                </svg>
                Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  shareVCardWhatsApp();
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Copy Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Identity Card (ID Card) --- */}
      {activeModal === "idcard" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Official Identity Card</h3>

            {/* ID Card Badge */}
            <div className="mt-4 mx-auto w-full rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-950 p-5 text-white shadow-xl">
              <div className="border-b border-indigo-800 pb-3">
                <span className="text-[11px] font-black tracking-widest uppercase text-amber-300">
                  BAYACONNECT REAL ESTATE
                </span>
                <p className="text-[10px] text-indigo-200">Authorized Channel Partner Badge</p>
              </div>

              {/* Avatar placeholder with Initials */}
              <div className="mt-4 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-400 p-1 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900 text-2xl font-black text-amber-300">
                  {name.charAt(0).toUpperCase()}
                </div>
              </div>

              <h4 className="mt-3 text-lg font-bold text-white">{name}</h4>
              <p className="font-mono text-xs font-bold text-amber-300">{agentCode}</p>

              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  ✓ Verified ID
                </span>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-200 border border-indigo-500/30">
                  {planTier} Plan
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-white/10 p-2.5 text-left text-[11px] space-y-1">
                <div className="flex justify-between text-indigo-200">
                  <span>Phone:</span>
                  <span className="font-semibold text-white">{phone}</span>
                </div>
                <div className="flex justify-between text-indigo-200">
                  <span>Location:</span>
                  <span className="font-semibold text-white">{city || "Ghaziabad/NCR"}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={shareIdCardWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white hover:bg-[#20ba59] transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm0 18.16c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.39 0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.25-8.24 8.25zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
                </svg>
                Share ID on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
