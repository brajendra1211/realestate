"use client";

import { createInvestorFeeOrderAction, confirmInvestorFeeAction } from "@/app/agent/investors/payActions";
import { RazorpayButton } from "@/components/RazorpayButton";

export function InvestorFeePayButton({ investorProfileId, fee }: { investorProfileId: string; fee: number }) {
  return (
    <RazorpayButton
      label={`Pay ₹${fee.toLocaleString("en-IN")} fee`}
      description="Referral partner registration fee"
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      start={() => createInvestorFeeOrderAction(investorProfileId)}
      finish={(p) => confirmInvestorFeeAction(investorProfileId, p)}
    />
  );
}
