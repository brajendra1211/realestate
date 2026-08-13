import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FREE_LISTING_LIMITS } from "@/lib/listing-quota";
import {
  verifyUser,
  unverifyUser,
  assignSubscription,
  cancelSubscription,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
} from "../actions";

type SearchParams = Promise<{ role?: string; status?: string; saved?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { role, status, saved } = await searchParams;

  const [users, plans] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: role === "DEALER" || role === "OWNER" ? role : { in: ["DEALER", "OWNER"] },
        ...(status === "verified" ? { verified: true } : {}),
        ...(status === "pending" ? { verified: false } : {}),
      },
      include: {
        _count: { select: { properties: true } },
        subscriptions: {
          where: { status: { in: ["ACTIVE", "PENDING"] } },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const filterLink = (params: { role?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params.role) query.set("role", params.role);
    if (params.status) query.set("status", params.status);
    const qs = query.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dealers &amp; Owners</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Verify a profile to make it (and its listings) publicly visible on the site.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          { label: "All", href: filterLink({ status }) },
          { label: "Dealers", href: filterLink({ role: "DEALER", status }) },
          { label: "Owners", href: filterLink({ role: "OWNER", status }) },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              (item.label === "Dealers" && role === "DEALER") ||
              (item.label === "Owners" && role === "OWNER") ||
              (item.label === "All" && !role)
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </a>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        {[
          { label: "Pending", value: "pending" },
          { label: "Verified", value: "verified" },
        ].map((item) => (
          <a
            key={item.value}
            href={filterLink({ role, status: item.value })}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              status === item.value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No accounts match this filter.
          </p>
        ) : (
          users.map((user) => {
            const activeSub = user.subscriptions.find((sub) => sub.status === "ACTIVE");
            const pendingSub = user.subscriptions.find((sub) => sub.status === "PENDING");
            const freeLimit = FREE_LISTING_LIMITS[user.role] ?? 0;
            const eligiblePlans = plans.filter((plan) => plan.role === "BOTH" || plan.role === user.role);

            return (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{user.company ?? user.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {user.role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {user.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {user.name} · {user.email} {user.phone ? `· ${user.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user._count.properties} listing(s)
                    {user.slug &&
                      ` · ${user.role === "DEALER" ? "/dealers/" : "/owners/"}${user.slug}`}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Plan: {activeSub ? activeSub.plan.name : `Free (${freeLimit} listings)`}
                    {activeSub && ` · ${activeSub.plan.listingLimit} listings`}
                    {activeSub?.endDate &&
                      ` · expires ${activeSub.endDate.toLocaleDateString("en-IN")}`}
                  </p>
                  {pendingSub && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <p className="text-xs text-amber-800">
                        Requested <span className="font-semibold">{pendingSub.plan.name}</span> (₹
                        {pendingSub.plan.price.toLocaleString("en-IN")}) — awaiting payment
                        confirmation
                      </p>
                      <form action={approveSubscriptionRequest}>
                        <input type="hidden" name="id" value={pendingSub.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectSubscriptionRequest}>
                        <input type="hidden" name="id" value={pendingSub.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {eligiblePlans.length > 0 && (
                    <form action={assignSubscription} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="planId"
                        required
                        defaultValue=""
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="" disabled>
                          Assign plan…
                        </option>
                        {eligiblePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.listingLimit})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Assign
                      </button>
                    </form>
                  )}
                  {activeSub && (
                    <form action={cancelSubscription}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove plan
                      </button>
                    </form>
                  )}
                  {user.verified ? (
                    <form action={unverifyUser}>
                      <input type="hidden" name="id" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Unverify
                      </button>
                    </form>
                  ) : (
                    <form action={verifyUser}>
                      <input type="hidden" name="id" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Verify &amp; activate
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
