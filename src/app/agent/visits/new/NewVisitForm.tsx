"use client";

import { useActionState, useEffect } from "react";
import { requestVisitOtpAction, type VisitOtpState } from "../actions";

const initialState: VisitOtpState = {};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter the customer's phone number and the Master Property ID.",
  send: "Couldn't send the OTP. Check the phone number and try again.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function NewVisitForm({
  defaultCustomerPhone,
  defaultMasterId,
}: {
  defaultCustomerPhone?: string;
  defaultMasterId?: string;
}) {
  const [state, formAction, pending] = useActionState(requestVisitOtpAction, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Try again."}
        </p>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">Customer phone number</label>
        <input
          type="tel"
          name="customerPhone"
          required
          defaultValue={defaultCustomerPhone}
          className={inputClass}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Customer name (optional)</label>
        <input type="text" name="customerName" className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Master Property ID</label>
        <input
          type="text"
          name="masterId"
          required
          placeholder="PROP-DEL-2026-8891"
          defaultValue={defaultMasterId}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send OTP to customer"}
      </button>
    </form>
  );
}
