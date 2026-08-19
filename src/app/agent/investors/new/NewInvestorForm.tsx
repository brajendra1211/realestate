"use client";

import { useActionState, useEffect } from "react";
import { createInvestor, type CreateInvestorState } from "./actions";

const initialState: CreateInvestorState = {};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in the investor's name, email, and phone.",
  duplicate: "An account with this email already exists.",
  agentNotFound: "Your agent profile could not be found.",
  notPrime: "Activate your Prime plan before registering investors.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function NewInvestorForm() {
  const [state, formAction, pending] = useActionState(createInvestor, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">Investor name</label>
        <input
          type="text"
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Phone</label>
        <input
          type="tel"
          name="phone"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Registering…" : "Register Investor"}
      </button>
    </form>
  );
}
