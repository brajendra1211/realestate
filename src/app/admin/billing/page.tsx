import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RunBillingCheckButton } from "./RunBillingCheckButton";

export default async function AdminBillingPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const dueToday = await prisma.subscription.count({
    where: { status: "ACTIVE", endDate: { lte: new Date() } },
  });

  // Agents who *had* Prime (have an Agent Code, meaning they activated at
  // least once) but currently aren't Prime — i.e. demoted, not just never
  // activated.
  const actuallyDemoted = await prisma.agentProfile.findMany({
    where: { primeStatus: false, agentCode: { not: null } },
    select: { agentCode: true, walletBalance: true, user: { select: { name: true, phone: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Prime Billing</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Monthly Prime subscription auto-debits from the agent&apos;s wallet daily at 3am
        (§3.1). Failed renewals demote the agent — not delete them — and stop them receiving
        new leads until they top up and reactivate.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          {dueToday} subscription{dueToday === 1 ? "" : "s"} due for renewal right now.
        </p>
        <RunBillingCheckButton />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Currently demoted agents</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {actuallyDemoted.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No demoted agents.</p>
        ) : (
          actuallyDemoted.map((agent) => (
            <div key={agent.agentCode} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {agent.agentCode} ({agent.user.name})
                </p>
                <p className="text-xs text-slate-400">Wallet: ₹{agent.walletBalance}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Demoted
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
