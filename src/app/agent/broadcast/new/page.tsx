import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { BroadcastSocietyField } from "@/components/agent/BroadcastSocietyField";
import { createBroadcastAction } from "../actions";

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Fill in flat size and a valid budget range.",
  noLocation: "Your shop location isn't set yet — contact admin to fix your address.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default async function NewBroadcastPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) redirect("/agent/dashboard");

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Post a requirement</h1>
      <p className="mt-1 text-sm text-slate-500">
        Need a flat from another agent&apos;s inventory? Broadcast it to every Prime agent in
        radius — no typing, pure dropdowns (§3.6).
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={createBroadcastAction} className="mt-6 space-y-4">
        <BroadcastSocietyField />

        <div>
          <label className="text-sm font-medium text-slate-700">Flat size</label>
          <select name="flatSize" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select
            </option>
            {["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Plot"].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Transaction type</label>
          <select name="txnType" required defaultValue="BUY" className={inputClass}>
            <option value="BUY">Buy</option>
            <option value="RENT">Rent</option>
            <option value="SELL">Sell</option>
            <option value="LETOUT">Letout</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Budget min (₹)</label>
            <input type="number" name="budgetMin" min={0} required className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Budget max (₹)</label>
            <input type="number" name="budgetMax" min={0} required className={inputClass} />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Broadcast to nearby agents
        </button>
      </form>
    </div>
  );
}
