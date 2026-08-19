"use client";

import { useActionState } from "react";
import { runBillingCheckAction, type BillingCheckState } from "./actions";

export function RunBillingCheckButton() {
  const [state, formAction, pending] = useActionState(runBillingCheckAction, null as BillingCheckState);

  return (
    <>
      {state && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Billing check ran: {state.renewed} renewed, {state.demoted} demoted.
        </p>
      )}
      <form action={formAction} className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Running…" : "Run billing check now"}
        </button>
      </form>
    </>
  );
}
