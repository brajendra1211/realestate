"use client";

import { useTransition } from "react";
import { adminRenewAgentPrimeAction } from "./actions";

export function RenewPrimeButton({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await adminRenewAgentPrimeAction(formData);
        });
      }}
    >
      <input type="hidden" name="agentId" value={agentId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
      >
        <span>⚡</span>
        <span>{isPending ? "Renewing..." : "Renew Prime (+30d)"}</span>
      </button>
    </form>
  );
}
