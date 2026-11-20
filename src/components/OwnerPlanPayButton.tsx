"use client";

import { createOwnerPlanOrderAction, confirmOwnerPlanPaymentAction } from "@/app/dashboard/actions";
import { RazorpayButton } from "@/components/RazorpayButton";

export function OwnerPlanPayButton({
  planId,
  label,
  className,
  redirectTo,
}: {
  planId: string;
  label: string;
  className?: string;
  redirectTo?: string;
}) {
  return (
    <RazorpayButton
      label={label}
      className={className}
      start={() => createOwnerPlanOrderAction(planId)}
      finish={(p) => confirmOwnerPlanPaymentAction(planId, p)}
      onSuccess={() => {
        if (redirectTo) window.location.href = redirectTo;
        else window.location.reload();
      }}
    />
  );
}
