import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPendingPayouts } from "@/lib/payout";
import { getSiteSettings } from "@/lib/site-settings";
import { formatINR, PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/format";
import { processPayoutAction, rejectPayoutAction } from "./actions";

type SearchParams = Promise<{ saved?: string }>;

export default async function AdminPayoutsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved } = await searchParams;
  const [payouts, settings] = await Promise.all([getPendingPayouts(), getSiteSettings()]);

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Agent Payouts</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Agent wallet → bank withdrawal requests. TDS ({settings.tdsPercent}%, editable in{" "}
        <a href="/admin/settings" className="text-blue-600 hover:underline">
          Website Settings → Payments
        </a>
        ) is deducted automatically at request time — mark paid once the net amount is actually
        transferred.
      </p>

      {saved === "paid" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Payout marked paid.
        </p>
      )}
      {saved === "rejected" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Payout rejected — amount credited back to agent wallet.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {payouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No pending payout requests.
          </p>
        ) : (
          payouts.map((payout) => (
            <div
              key={payout.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {payout.agent.agentCode} · {payout.agent.user.name}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  Gross {formatINR(payout.grossAmount)} · TDS ({payout.tdsPercent}%){" "}
                  {formatINR(payout.tdsAmount)} · Net{" "}
                  <span className="font-semibold text-slate-900">{formatINR(payout.netAmount)}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Requested {payout.requestedAt.toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={processPayoutAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={payout.id} />
                  <select
                    name="paymentMode"
                    defaultValue="BANK_TRANSFER"
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {PAYMENT_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Mark Paid
                  </button>
                </form>
                <form action={rejectPayoutAction}>
                  <input type="hidden" name="id" value={payout.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
