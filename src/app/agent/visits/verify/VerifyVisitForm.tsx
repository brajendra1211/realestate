"use client";

import { useActionState, useEffect } from "react";
import { logVisitAction, type LogVisitState } from "../actions";

const initialState: LogVisitState = {};

const ERROR_MESSAGES: Record<string, string> = {
  invalidOtp: "That code is incorrect or has expired.",
  propertyNotFound: "No listing found with that Master Property ID.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function VerifyVisitForm({
  customerPhone,
  masterId,
  customerName,
}: {
  customerPhone: string;
  masterId: string;
  customerName?: string;
}) {
  const [state, formAction, pending] = useActionState(logVisitAction, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <>
      {state.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="customerPhone" value={customerPhone} />
        <input type="hidden" name="masterId" value={masterId} />
        <input type="hidden" name="customerName" value={customerName ?? ""} />
        <div>
          <label className="text-sm font-medium text-slate-700">6-digit code</label>
          <input
            type="text"
            name="otp"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Verifying…" : "Verify & log visit"}
        </button>
      </form>
    </>
  );
}
