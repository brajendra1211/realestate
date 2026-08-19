"use client";

import { useActionState, useEffect } from "react";
import { requestInvestorOtp, type InvestorLoginState } from "./actions";

const initialState: InvestorLoginState = {};

const ERROR_MESSAGES: Record<string, string> = {
  required: "Enter your phone number or email.",
  send: "Couldn't send the code. Check the number/email and try again.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function InvestorLoginForm({ defaultIdentifier }: { defaultIdentifier?: string }) {
  const [state, formAction, pending] = useActionState(requestInvestorOtp, initialState);

  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Try again."}
        </p>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">Phone number or email</label>
        <input
          type="text"
          name="identifier"
          required
          defaultValue={defaultIdentifier}
          placeholder="98765 43210 or you@email.com"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send code on WhatsApp"}
      </button>
    </form>
  );
}
