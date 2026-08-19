"use client";

import { useActionState, useEffect } from "react";
import { verifyInvestorOtp, resendInvestorOtp, type InvestorVerifyState } from "./actions";

const initialState: InvestorVerifyState = {};

const ERROR_MESSAGES: Record<string, string> = {
  required: "Enter the code we sent you.",
  invalid: "That code is incorrect/expired, or no investor account exists for this phone/email yet.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function InvestorVerifyForm({ identifier }: { identifier: string }) {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyInvestorOtp, initialState);
  const [resendState, resendAction, resendPending] = useActionState(resendInvestorOtp, initialState);

  useEffect(() => {
    if (verifyState.redirectTo) window.location.href = verifyState.redirectTo;
  }, [verifyState]);
  useEffect(() => {
    if (resendState.redirectTo) window.location.href = resendState.redirectTo;
  }, [resendState]);

  const error = verifyState.error;

  return (
    <>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={verifyAction} className="mt-6 space-y-4">
        <input type="hidden" name="identifier" value={identifier} />
        <div>
          <label className="text-sm font-medium text-slate-700">6-digit code</label>
          <input
            type="text"
            name="otp"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={verifyPending}
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {verifyPending ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <form action={resendAction} className="mt-3 text-center">
        <input type="hidden" name="identifier" value={identifier} />
        <button
          type="submit"
          disabled={resendPending}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
        >
          {resendPending ? "Resending…" : "Resend code"}
        </button>
      </form>
    </>
  );
}
