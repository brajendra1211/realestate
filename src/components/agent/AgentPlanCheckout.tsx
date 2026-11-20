"use client";

import { useState } from "react";
import { PlanPicker, type PickerPlan } from "@/components/agent/PlanPicker";
import { AgentPlanPayButton } from "@/components/agent/AgentPlanPayButton";

/** Plan picker + pay button for the agent dashboard (first payment, upgrade or renewal). */
export function AgentPlanCheckout({
  plans,
  mode,
  defaultPlanId,
}: {
  plans: PickerPlan[];
  mode: "register" | "upgrade";
  defaultPlanId?: string;
}) {
  const best = plans.filter((p) => p.tier === "PRIME").sort((a, b) => b.months - a.months)[0] ?? plans[0];
  const [planId, setPlanId] = useState(defaultPlanId ?? best?.id ?? "");
  const selected = plans.find((p) => p.id === planId);
  if (!plans.length) return null;

  return (
    <div className="space-y-4">
      <PlanPicker plans={plans} value={planId} onChange={setPlanId} />
      <AgentPlanPayButton
        key={planId}
        planId={planId}
        mode={mode}
        label={`Pay ₹${(selected?.price ?? 0).toLocaleString("en-IN")} & activate`}
        className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-60"
      />
    </div>
  );
}
