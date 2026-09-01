"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SwitchAgentButtonProps {
  listingId: string;
  switchedAlready: boolean;
  expiresAt: string | null;
}

export function SwitchAgentButton({
  listingId,
  switchedAlready,
  expiresAt,
}: SwitchAgentButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isComplaint, setIsComplaint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  if (switchedAlready) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
        ✓ 1-Time Free Switch Agent option was used for this unlock.
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
        24-Hour customer protection switch window has ended.
      </div>
    );
  }

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for switching.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/buyer/switch-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentListingId: listingId,
          reason,
          isComplaint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to switch agent");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to switch agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      {!isOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Agent not responding? Customer Protection Policy gives you 1 free agent switch within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Switch Agent (Free)
          </button>
        </div>
      ) : (
        <form onSubmit={handleSwitch} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Request New Agent</p>
          <p className="mt-0.5 text-xs text-slate-500">
            We will immediately re-assign another top-rated Prime agent in this area for your unlock.
          </p>

          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

          <div className="mt-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why would you like to switch? (e.g. Agent not answering calls, unavailable for visit)"
              rows={2}
              required
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isComplaint}
              onChange={(e) => setIsComplaint(e.target.checked)}
              className="rounded border-slate-300"
            />
            File formal complaint against current agent (blocks them from your account)
          </label>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Switching..." : "Confirm Switch"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
