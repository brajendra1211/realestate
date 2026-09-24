"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, PROPERTY_TYPE_LABELS } from "@/lib/format";

type ListingItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  exactAddress: string;
  amenities: string | null;
  images: { id: string; url: string; order: number }[];
  masterProperty: {
    city: string;
    locality: string | null;
  };
};

type ShopClientViewProps = {
  agentCode: string;
  name: string;
  shopName: string | null;
  shopAddress: string | null;
  city: string | null;
  phone: string;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  avatar: string | null;
  primeStatus: boolean;
  yearsExperience: number | null;
  staffCount: number | null;
  reraNumber: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  qrDataUrl: string;
  shopUrl: string;
  listings: ListingItem[];
};

export function ShopClientView({
  agentCode,
  name,
  shopName,
  shopAddress,
  city,
  phone,
  alternatePhone,
  whatsappNumber,
  avatar,
  primeStatus,
  yearsExperience,
  staffCount,
  reraNumber,
  ratingAvg,
  ratingCount,
  qrDataUrl,
  shopUrl,
  listings,
}: ShopClientViewProps) {
  const [filterType, setFilterType] = useState<"ALL" | "RENT" | "SALE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const effectiveWhatsapp = (whatsappNumber || phone).replace(/[^0-9]/g, "");
  const whatsappLink = `https://wa.me/91${effectiveWhatsapp.slice(-10)}?text=${encodeURIComponent(
    `Hello ${name}, I scanned your QR code on BayaEstate and would like to inquire about your available properties.`
  )}`;

  const filteredListings = listings.filter((item) => {
    if (filterType !== "ALL" && item.listingType !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchLocality = (item.masterProperty?.locality || "").toLowerCase().includes(q);
      const matchType = (PROPERTY_TYPE_LABELS[item.propertyType] || item.propertyType).toLowerCase().includes(q);
      return matchTitle || matchLocality || matchType;
    }
    return true;
  });

  const rentCount = listings.filter((l) => l.listingType === "RENT").length;
  const saleCount = listings.filter((l) => l.listingType === "SALE").length;

  function copyShopLink() {
    navigator.clipboard.writeText(shopUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `${shopName || name} | BayaEstate Partner`,
        text: `Check out properties by ${name} (${agentCode}) on BayaEstate:`,
        url: shopUrl,
      }).catch(() => {});
    } else {
      copyShopLink();
    }
  }

  return (
    <div className="space-y-8">
      {/* --- HERO / SHOP HEADER CARD --- */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 opacity-60 pointer-events-none" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Agent Info */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-3xl font-extrabold text-white shadow-md overflow-hidden">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span>{name.charAt(0).toUpperCase()}</span>
              )}
              {primeStatus && (
                <div className="absolute bottom-1 right-1 rounded-full bg-amber-400 p-1 text-[10px] text-slate-900 shadow" title="Prime Partner">
                  ★
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Partner
                </span>
                {primeStatus && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                    Prime Agent
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {agentCode}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {shopName || name}
              </h1>

              {shopName && (
                <p className="text-sm font-medium text-slate-600">
                  Managed by <span className="font-semibold text-slate-800">{name}</span>
                </p>
              )}

              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {shopAddress || city || "Ghaziabad / NCR, Uttar Pradesh"}
              </p>

              {/* Badges / Rating */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
                <div className="flex items-center gap-1 font-bold text-amber-600">
                  <span>★</span>
                  <span>{ratingAvg ? ratingAvg.toFixed(1) : "5.0"}</span>
                  <span className="text-slate-400 font-normal">({ratingCount || "New"})</span>
                </div>
                {yearsExperience ? (
                  <div>
                    <span className="font-bold text-slate-900">{yearsExperience}+</span> Years Experience
                  </div>
                ) : null}
                {reraNumber ? (
                  <div className="font-mono text-slate-500">
                    RERA: <span className="text-slate-800 font-semibold">{reraNumber}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick QR & Share Buttons */}
          <div className="flex flex-row md:flex-col items-center sm:items-end gap-2.5 pt-2 md:pt-0">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:border-slate-400"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              View Shop QR
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {copiedLink ? "Link Copied!" : "Share Profile"}
            </button>
          </div>
        </div>

        {/* Action Buttons: Call & WhatsApp */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <a
            href={`tel:${phone}`}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call {phone}
          </a>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.17c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.174 8.174 0 01-1.26-4.41c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4a8.156 8.156 0 012.4 5.8c0 4.52-3.68 8.2-8.2 8.2zm4.5-6.15c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.36-.77-1.86c-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.69.45-.04 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28z" />
            </svg>
            WhatsApp Inquiry
          </a>

          <Link
            href={`/list-property/gold?ref=${encodeURIComponent(agentCode)}`}
            className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
          >
            <span>🏠</span>
            List Property With Agent
          </Link>
        </div>
      </section>

      {/* --- INVENTORY / LISTINGS SECTION --- */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Properties Available ({listings.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse direct listings managed by {name}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({listings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("RENT")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "RENT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Rent ({rentCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SALE")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "SALE"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Sale ({saleCount})
            </button>
          </div>
        </div>

        {/* Search within Agent's Shop */}
        {listings.length > 3 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title, BHK, locality, or property type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
              🏢
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">No properties found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {listings.length === 0
                ? "This agent hasn't published active listings yet. Contact them directly to enquire about off-market deals."
                : "No listings match your selected filter."}
            </p>
            <div className="mt-4">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Inquire on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((item) => {
              const primaryImage = item.images[0]?.url || "/placeholder-property.jpg";
              const typeLabel = PROPERTY_TYPE_LABELS[item.propertyType] || item.propertyType;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryImage}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm ${
                          item.listingType === "RENT" ? "bg-indigo-600" : "bg-emerald-600"
                        }`}
                      >
                        {item.listingType === "RENT" ? "For Rent" : "For Sale"}
                      </span>
                      <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                        {typeLabel}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 rounded-xl bg-slate-900/90 px-3 py-1 font-mono text-xs font-extrabold text-white backdrop-blur-xs">
                      {formatPrice(item.price, item.listingType)}
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="flex flex-1 flex-col p-4 justify-between">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {item.masterProperty.locality ? `${item.masterProperty.locality}, ` : ""}
                        {item.masterProperty.city}
                      </p>

                      {/* Specs pills */}
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
                        {item.bedrooms ? (
                          <span className="rounded-lg bg-slate-50 px-2 py-1 border border-slate-100">
                            🛏 {item.bedrooms} BHK
                          </span>
                        ) : null}
                        {item.bathrooms ? (
                          <span className="rounded-lg bg-slate-50 px-2 py-1 border border-slate-100">
                            🚿 {item.bathrooms} Bath
                          </span>
                        ) : null}
                        {item.areaSqft ? (
                          <span className="rounded-lg bg-slate-50 px-2 py-1 border border-slate-100">
                            📐 {item.areaSqft} sq.ft
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/listings/${item.slug}`}
                        className="flex-1 rounded-xl bg-slate-900 py-2 text-center text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        View Details
                      </Link>
                      <a
                        href={`https://wa.me/91${effectiveWhatsapp.slice(-10)}?text=${encodeURIComponent(
                          `Hi ${name}, I am interested in property: "${item.title}" (${item.listingType === "RENT" ? "Rent" : "Sale"}) on BayaEstate.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                        title="Chat about this property"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.17c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.174 8.174 0 01-1.26-4.41c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4a8.156 8.156 0 012.4 5.8c0 4.52-3.68 8.2-8.2 8.2z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- MODAL: AGENT SHOP UNIQUE QR CODE --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
              Verified BayaEstate Partner
            </span>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{shopName || name}</h3>
            <p className="font-mono text-xs text-blue-600 font-bold">{agentCode}</p>
            <p className="text-xs text-slate-500 mt-1">{shopAddress || city || "Ghaziabad/NCR"}</p>

            {/* The standard scannable QR Code */}
            <div className="mt-5 mx-auto w-56 h-56 rounded-2xl border-4 border-slate-900 bg-white p-3 shadow-inner flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code for ${name}`}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="mt-3 text-[11px] text-slate-600 font-medium">
              Scan with any phone camera or Google Lens to open this agent&apos;s shop & properties directly.
            </p>

            <div className="mt-5 flex gap-2">
              <a
                href={`/api/agent/qr?code=${encodeURIComponent(agentCode)}&format=png&download=true`}
                download={`Shop-QR-${agentCode}.png`}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Download PNG
              </a>
              <a
                href={`/api/agent/qr?code=${encodeURIComponent(agentCode)}&format=svg&download=true`}
                download={`Shop-QR-${agentCode}.svg`}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Download SVG
              </a>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Print Shop Standee
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
