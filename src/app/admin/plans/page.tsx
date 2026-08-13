import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FREE_LISTING_LIMITS } from "@/lib/listing-quota";
import { FREE_LEAD_LIMITS } from "@/lib/lead-quota";
import { createPlan, updatePlan, deletePlan } from "../actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const ROLE_OPTIONS = [
  { value: "BOTH", label: "Owners & Dealers" },
  { value: "OWNER", label: "Owners only" },
  { value: "DEALER", label: "Dealers only" },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default async function AdminPlansPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;
  const plans = await prisma.plan.findMany({
    include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ active: "desc" }, { price: "asc" }],
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Listing plans</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Owners get {FREE_LISTING_LIMITS.OWNER} free listings and {FREE_LEAD_LIMITS.OWNER} free
          lead reveals by default; dealers get {FREE_LISTING_LIMITS.DEALER} listings and{" "}
          {FREE_LEAD_LIMITS.DEALER} lead reveals. A buyer&apos;s contact info on an enquiry stays
          hidden until the lister spends a lead reveal to view it — create paid plans here to
          raise both caps, then assign a plan from{" "}
          <span className="font-medium">Dealers &amp; Owners</span> once they&apos;ve paid.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}
      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Enter a name and a listing limit greater than 0.
        </p>
      )}

      <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Add plan</h2>
        <form action={createPlan} className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input type="text" name="name" required placeholder="e.g. Growth" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Listing limit</label>
              <input type="number" name="listingLimit" required min={1} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Lead limit</label>
              <input type="number" name="leadLimit" min={1} placeholder="Unlimited" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Price (INR)</label>
              <input type="number" name="price" min={0} defaultValue={0} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Duration (days)</label>
              <input type="number" name="durationDays" min={1} placeholder="No expiry" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Applies to</label>
            <select name="role" defaultValue="BOTH" className={inputClass}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add plan
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-3">
        {plans.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No plans yet — add one above.
          </p>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <form action={updatePlan} className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:items-end">
                <input type="hidden" name="id" value={plan.id} />
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500">Name</label>
                  <input type="text" name="name" required defaultValue={plan.name} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Listings</label>
                  <input
                    type="number"
                    name="listingLimit"
                    required
                    min={1}
                    defaultValue={plan.listingLimit}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Leads</label>
                  <input
                    type="number"
                    name="leadLimit"
                    min={1}
                    placeholder="Unlimited"
                    defaultValue={plan.leadLimit ?? undefined}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Price (INR)</label>
                  <input type="number" name="price" min={0} defaultValue={plan.price} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Applies to</label>
                  <select name="role" defaultValue={plan.role} className={inputClass}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Duration (days)</label>
                  <input
                    type="number"
                    name="durationDays"
                    min={1}
                    placeholder="No expiry"
                    defaultValue={plan.durationDays ?? undefined}
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 sm:col-span-7">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="active" defaultChecked={plan.active} className="h-4 w-4 rounded border-slate-300" />
                      Active
                    </label>
                    <span className="text-xs text-slate-400">
                      {plan._count.subscriptions} active subscriber{plan._count.subscriptions === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
              <form action={deletePlan} className="mt-2">
                <input type="hidden" name="id" value={plan.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Delete plan
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
