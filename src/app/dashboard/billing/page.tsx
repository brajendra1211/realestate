import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function DashboardBillingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment history</h1>
        <p className="mt-1 text-sm text-slate-500">Every plan you&apos;ve requested or been assigned.</p>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No plan history yet — you&apos;re on the free plan.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{subscription.plan.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {(subscription.amount ?? subscription.plan.price) === 0
                      ? "Free"
                      : `₹${(subscription.amount ?? subscription.plan.price).toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[subscription.status]}`}
                    >
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {subscription.createdAt.toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {subscription.endDate ? subscription.endDate.toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
