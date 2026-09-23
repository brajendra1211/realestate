"use client";

import { useActionState, useEffect } from "react";
import { register, type RegisterState } from "./actions";

const initialState: RegisterState = {};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in your name, email, and an 8+ character password.",
  duplicate: "An account with this email already exists.",
  company: "Company / agency name is required for a Dealer account.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function RegisterForm({ accountType }: { accountType: "OWNER" | "DEALER" }) {
  const [state, formAction, pending] = useActionState(register, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="accountType" value={accountType} />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">Full name</label>
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
          suppressHydrationWarning
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Phone</label>
        <input
          type="tel"
          name="phone"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">
          Company / Agency name{accountType === "DEALER" ? "" : " (optional)"}
        </label>
        <input
          type="text"
          name="company"
          required={accountType === "DEALER"}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {accountType === "DEALER" && (
          <p className="mt-1 text-xs text-slate-400">
            Shown on your public dealer profile page for search visibility.
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
