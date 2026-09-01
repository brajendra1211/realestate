"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DealData {
  id: string;
  dealValue: number;
  status: "ACTIVE" | "TOKEN_RECEIVED" | "AGREEMENT_DONE" | "REGISTRY_COMPLETED" | "CLOSED" | "CANCELLED";
  totalCommission: number;
  platformCommission: number;
  buyerCommission: number | null;
  sellerCommission: number | null;
  tokenAmount: number | null;
  commissionDistributed: boolean;
  propertyTitle: string | null;
}

interface DealLifecycleCardProps {
  deal: DealData | null;
  broadcastId: string;
  myAgentId: string;
  otherAgentId: string;
}

const STAGES = [
  { key: "ACTIVE", label: "Negotiation" },
  { key: "TOKEN_RECEIVED", label: "Token Received" },
  { key: "AGREEMENT_DONE", label: "Agreement Done" },
  { key: "REGISTRY_COMPLETED", label: "Registry Done" },
  { key: "CLOSED", label: "Closed" },
];

export function DealLifecycleCard({
  deal: initialDeal,
  broadcastId,
  myAgentId,
  otherAgentId,
}: DealLifecycleCardProps) {
  const router = useRouter();
  const [deal, setDeal] = useState<DealData | null>(initialDeal);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dealValue, setDealValue] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(dealValue);
    if (!val || val <= 0) {
      setError("Please enter a valid deal value.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealValue: val,
          broadcastId,
          buyerAgentId: myAgentId,
          sellerAgentId: otherAgentId,
          propertyTitle: "B2B Broadcast Property",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate deal");

      setDeal(data);
      setShowCreateModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async (nextStage: string) => {
    if (!deal) return;
    setLoading(true);
    setError(null);

    try {
      const body: any = { status: nextStage };
      if (nextStage === "TOKEN_RECEIVED") {
        const amt = Number(tokenAmount || (deal.dealValue * 0.1));
        body.tokenAmount = amt;
      }

      const res = await fetch(`/api/agent/deals/${deal.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update stage");

      setDeal(data);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!deal) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
        <p className="text-xs text-slate-500">Negotiating this broadcast requirement?</p>
        {!showCreateModal ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            + Initiate B2B Deal (50-50 Split)
          </button>
        ) : (
          <form onSubmit={handleCreateDeal} className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="Deal Value (₹)"
              className="w-36 rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
            >
              {loading ? "Starting..." : "Start Deal"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              Cancel
            </button>
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </form>
        )}
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === deal.status);

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">B2B Deal In Progress</span>
          <p className="text-sm font-bold text-slate-900">
            ₹{deal.dealValue.toLocaleString("en-IN")} Deal Value
          </p>
        </div>
        <div className="text-right text-xs">
          <span className="font-semibold text-slate-700">Split:</span> 45% Buyer Agent · 45% Seller Agent · 10% Platform
          {deal.commissionDistributed && (
            <p className="font-bold text-green-700">✓ Commission Credited to Wallet</p>
          )}
        </div>
      </div>

      {/* 5-Stage Stepper */}
      <div className="mt-3 grid grid-cols-5 gap-1 text-center">
        {STAGES.map((s, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={s.key} className="flex flex-col items-center">
              <div
                className={`h-2 w-full rounded-full ${
                  isDone ? "bg-blue-600" : "bg-slate-200"
                } ${isCurrent ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
              />
              <span className={`mt-1 text-[10px] ${isCurrent ? "font-bold text-blue-800" : "text-slate-500"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {/* Stage Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-2">
        <p className="text-xs text-slate-600">
          Current Stage: <span className="font-semibold text-slate-900">{STAGES[currentIdx]?.label || deal.status}</span>
        </p>

        {deal.status === "ACTIVE" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAdvanceStage("TOKEN_RECEIVED")}
            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Mark Token Received →
          </button>
        )}
        {deal.status === "TOKEN_RECEIVED" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAdvanceStage("AGREEMENT_DONE")}
            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Mark Agreement Done →
          </button>
        )}
        {deal.status === "AGREEMENT_DONE" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAdvanceStage("REGISTRY_COMPLETED")}
            className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
          >
            Complete Registry & Distribute Commissions (50-50) →
          </button>
        )}
        {deal.status === "REGISTRY_COMPLETED" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAdvanceStage("CLOSED")}
            className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-900"
          >
            Close Deal (Archived)
          </button>
        )}
      </div>
    </div>
  );
}
