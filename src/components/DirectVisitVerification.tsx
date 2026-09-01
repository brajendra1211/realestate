"use client";

import { useState } from "react";

interface DirectVisitProps {
  listingId: string;
  isUnlocked: boolean;
}

export function DirectVisitVerification({ listingId, isUnlocked }: DirectVisitProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementInfo, setAgreementInfo] = useState<any>(null);

  if (!isUnlocked) return null;

  const handleRequestOtp = () => {
    setLoading(true);
    setError(null);

    // Geolocation capture
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await submitVisitRequest(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        },
        async (err) => {
          console.warn("Geolocation denied or error", err);
          await submitVisitRequest(null, null, null);
        },
        { timeout: 10000 }
      );
    } else {
      submitVisitRequest(null, null, null);
    }
  };

  const submitVisitRequest = async (lat: number | null, lng: number | null, acc: number | null) => {
    try {
      const res = await fetch("/api/buyer/direct-visit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentListingId: listingId,
          latitude: lat,
          longitude: lng,
          locationAccuracy: acc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request visit verification");

      setVisitId(data.visitId);
      setIsOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId || !otp.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/direct-visit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify OTP");

      setVerified(true);
      setAgreementInfo(data.agreement);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-800">
        <div className="flex items-center gap-2 font-bold text-green-900">
          <span className="text-base">✓</span> Physical Property Visit Verified (GPS & OTP Tagged)
        </div>
        <p className="mt-1 text-green-700">
          Your physical visit was verified on site. Platform Anti-Bypass Deed is digitally active (Deed #{agreementInfo?.id?.slice(0, 8)}).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      {!isOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-800">Visiting this property in-person?</p>
            <p className="text-[11px] text-slate-500">
              Verify your physical visit on site via owner OTP for platform buyer protection & legal deed.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleRequestOtp}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Locating..." : "Verify Visit (OTP)"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerifyOtp} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-xs font-bold text-emerald-950">Enter Verification OTP</p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            A 6-digit OTP was sent to the owner/representative. Ask them for the OTP to confirm your physical presence.
          </p>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center text-sm font-mono tracking-widest focus:border-emerald-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Confirm Visit"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && !isOpen && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
