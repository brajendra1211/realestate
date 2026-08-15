import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { requestVisitOtpAction } from "../actions";

type SearchParams = Promise<{ error?: string; customerPhone?: string; masterId?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter the customer's phone number and the Master Property ID.",
  send: "Couldn't send the OTP. Check the phone number and try again.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default async function NewVisitPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { error, customerPhone, masterId } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Log a site visit</h1>
      <p className="mt-1 text-sm text-slate-500">
        Mandatory mobile + OTP verification before logging any visit (§3.8) — this is what
        protects you from another agent poaching a customer you already showed a flat to.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={requestVisitOtpAction} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Customer phone number</label>
          <input
            type="tel"
            name="customerPhone"
            required
            defaultValue={customerPhone}
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
            defaultValue={masterId}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Send OTP to customer
        </button>
      </form>
    </div>
  );
}
