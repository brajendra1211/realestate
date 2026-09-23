"use client";

import { useActionState, useEffect } from "react";
import { searchMasterProperty, type SearchMasterPropertyState } from "./actions";

const initialState: SearchMasterPropertyState = {};

const ERROR_MESSAGES: Record<string, string> = {
  notPrime: "Activate your Prime plan before listing properties.",
  validation: "City and address are required.",
  geocode: "Could not locate that address on the map. Please refine it and try again.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function NewListingSearchForm({
  defaultCity,
  defaultLocality,
  defaultAddress,
}: {
  defaultCity?: string;
  defaultLocality?: string;
  defaultAddress?: string;
}) {
  const [state, formAction, pending] = useActionState(searchMasterProperty, initialState);

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
        <label className="text-sm font-medium text-slate-700">City</label>
        <input
          type="text"
          name="city"
          required
          defaultValue={defaultCity}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Locality / Society (optional)</label>
        <input
          type="text"
          name="locality"
          defaultValue={defaultLocality}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Full address</label>
        <textarea
          name="address"
          required
          rows={2}
          defaultValue={defaultAddress}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Check for existing listings"}
      </button>
    </form>
  );
}
