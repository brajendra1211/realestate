import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getInvestorsForAgent } from "@/lib/investor";

export default async function AgentInvestorsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const investors = await getInvestorsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Investors</h1>
        <a
          href="/agent/investors/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Register Investor
        </a>
      </div>

      {investors.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">You haven&apos;t registered any investors yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {investors.map((investor) => (
            <div key={investor.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-mono font-semibold text-slate-900">
                  {investor.investorCode ?? "Pending code"}
                </p>
                <p className="text-xs text-slate-500">
                  Registered {investor.registeredAt.toLocaleDateString("en-IN")}
                  {investor.expiresAt &&
                    ` · expires ${investor.expiresAt.toLocaleDateString("en-IN")}`}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  investor.feeStatus === "PAID"
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {investor.feeStatus === "PAID" ? "Active" : "Fee pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
