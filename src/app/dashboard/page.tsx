import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REQUEST_STATUS_LABEL } from "@/lib/listingRequest";
import { formatPrice } from "@/lib/format";
import { getListingUsage, getActiveSubscription } from "@/lib/listing-quota";
import { getSiteSettings } from "@/lib/site-settings";
import { OwnerPlanPayButton } from "@/components/OwnerPlanPayButton";
import { isPropertyExpired, daysUntil } from "@/lib/propertyVisibility";
import {
  deleteProperty,
  renewProperty,
  cancelSubscriptionRequest,
  relistPropertyAction,
} from "./actions";

const APPROVAL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

const RENEW_WINDOW_DAYS = 7;

type SearchParams = Promise<{
  requested?: string;
  renewed?: string;
  relisted?: string;
  error?: string;
}>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  // Admins manage every listing from the admin console; this owner view is empty for them.
  if (session.user.role === "ADMIN") redirect("/admin/properties");

  const { requested, renewed, relisted, error } = await searchParams;
  const isLister = session.user.role === "OWNER";
  // Owners and dealers cannot list on their own: they request a channel partner instead.
  const newHref = isLister ? "/list-property/request" : "/dashboard/properties/new";

  const [properties, usage, activeSubscription, pendingSubscription, plans, settings] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: session.user.id },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        assignedAgent: { select: { id: true, agentCode: true, shopName: true, user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    isLister ? getListingUsage(session.user.id, session.user.role) : null,
    isLister ? getActiveSubscription(session.user.id) : null,
    isLister
      ? prisma.subscription.findFirst({
          where: { userId: session.user.id, status: "PENDING" },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
      : null,
    isLister
      ? prisma.plan.findMany({
          where: { active: true, OR: [{ role: "OWNER" }, { role: "BOTH" }] },
          orderBy: { price: "asc" },
        })
      : [],
    getSiteSettings(),
  ]);

  const listingRequests = isLister
    ? await prisma.listingRequest.findMany({
        where: { userId: session.user.id, status: { not: "PENDING_PAYMENT" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            New and edited listings are reviewed by an admin before going live.
          </p>
        </div>
        <Link
          href={newHref}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {isLister ? "List a property" : "Add property"}
        </Link>
      </div>

      {listingRequests.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">My listing requests</p>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {listingRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-semibold text-slate-800">
                  {[r.locality, r.city].filter(Boolean).join(", ")} · {r.plan === "GOLD" ? "Pro" : "Basic"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{REQUEST_STATUS_LABEL[r.status]}</span>
                  <Link href={`/list-property/request/${r.id}?k=${r.statusToken}`} className="text-xs font-bold text-blue-600 hover:underline">
                    Track
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {renewed === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Listing renewed for another 30 days.
        </p>
      )}
      {relisted === "1" && (
        <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Property status updated to Available for new tenants.
        </p>
      )}
      {requested === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Plan requested — see payment details below to complete it.
        </p>
      )}
      {error === "plan" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          That plan isn&apos;t available. Pick another one below.
        </p>
      )}

      {usage && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {usage.used} of {usage.limit} listing{usage.limit === 1 ? "" : "s"} used
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Current plan:{" "}
                <span className="font-semibold text-slate-700">
                  {activeSubscription ? activeSubscription.plan.name : "No Active Plan (Paid plan required)"}
                </span>
                {activeSubscription?.endDate &&
                  ` · renews or expires ${activeSubscription.endDate.toLocaleDateString("en-IN")}`}
              </p>
            </div>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${usage.atLimit ? "bg-red-500" : "bg-blue-600"}`}
                style={{ width: `${Math.min((usage.used / Math.max(usage.limit, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {!activeSubscription && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div>
                <p className="text-sm font-bold text-blue-900">Active Paid Plan Required</p>
                <p className="text-xs text-blue-700">
                  Select an Owner Plan (₹{settings.basicListingFee} for 1 Month or ₹{settings.goldListingFee} for 3 Months) to start publishing verified properties.
                </p>
              </div>
              <Link
                href={newHref}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                Select Plan &amp; List
              </Link>
            </div>
          )}

          {pendingSubscription ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Request pending: {pendingSubscription.plan.name} (₹
                {pendingSubscription.plan.price.toLocaleString("en-IN")})
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Complete the payment below and we&apos;ll activate it shortly.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {settings.contactPhone && (
                  <a href={`tel:${settings.contactPhone}`} className="rounded-lg bg-white px-4 py-2 font-medium text-amber-800 shadow-sm">
                    Call {settings.contactPhone}
                  </a>
                )}
                {settings.whatsappNumber && (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white shadow-sm"
                  >
                    WhatsApp us
                  </a>
                )}
                {settings.contactEmail && (
                  <a href={`mailto:${settings.contactEmail}`} className="rounded-lg bg-white px-4 py-2 font-medium text-amber-800 shadow-sm">
                    Email us
                  </a>
                )}
                <form action={cancelSubscriptionRequest}>
                  <input type="hidden" name="id" value={pendingSubscription.id} />
                  <button type="submit" className="text-sm font-medium text-amber-700 underline-offset-2 hover:underline">
                    Cancel request
                  </button>
                </form>
              </div>
            </div>
          ) : plans.length > 0 && (usage.atLimit || !activeSubscription) ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-900">
                {usage.atLimit ? "Quota Reached — Upgrade to add more listings" : "Available plans"}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">{plan.name}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Up to {plan.listingLimit} listings ·{" "}
                      {plan.leadLimit === null ? "Unlimited" : plan.leadLimit} leads
                      {plan.durationDays ? ` · ${plan.durationDays} days` : " · No expiry"}
                    </p>
                    <div className="mt-3">
                      <OwnerPlanPayButton
                        planId={plan.id}
                        label={`Pay ₹${plan.price.toLocaleString("en-IN")} & activate`}
                        className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs text-white font-bold">✓</span>
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    Your {activeSubscription?.plan.name} is Active!
                  </p>
                  <p className="text-xs text-emerald-700">
                    You have <span className="font-bold">{usage.remaining} listing{usage.remaining === 1 ? "" : "s"}</span> remaining in this plan cycle.
                  </p>
                </div>
              </div>
              <Link
                href={newHref}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
              >
                + List Property Now
              </Link>
            </div>
          )}
        </div>
      )}

      {properties.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          You haven&apos;t listed any properties yet.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {properties.map((property) => {
            const expired = isPropertyExpired(property.expiresAt);
            const daysLeft = daysUntil(property.expiresAt);
            const showRenew = expired || (daysLeft !== null && daysLeft <= RENEW_WINDOW_DAYS);

            return (
              <div
                key={property.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {property.images[0] ? (
                    <Image
                      src={property.images[0].url}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{property.title}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[property.approvalStatus]}`}
                    >
                      {property.approvalStatus}
                    </span>
                    {property.status === "RENTED" && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-bold text-purple-700">
                        ✓ Rented Out
                      </span>
                    )}
                    {property.status === "SOLD" && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                        ✓ Sold
                      </span>
                    )}
                    {property.assignedAgent && (
                      <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        Agent: {property.assignedAgent.user.name} ({property.assignedAgent.agentCode ?? "Partner"})
                      </span>
                    )}
                    {expired ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Expired
                      </span>
                    ) : (
                      daysLeft !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            daysLeft <= RENEW_WINDOW_DAYS
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          Expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {[property.locality, property.city].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatPrice(property.price, property.listingType)}
                  </p>

                  {property.status === "RENTED" && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="font-semibold text-purple-700 flex items-center gap-1.5">
                        <span>●</span>
                        <span>Currently Rented Out</span>
                      </span>
                      <form action={relistPropertyAction}>
                        <input type="hidden" name="propertyId" value={property.id} />
                        <button
                          type="submit"
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
                        >
                          Mark Available (Re-list)
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {showRenew && (
                    <form action={renewProperty}>
                      <input type="hidden" name="id" value={property.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
                      >
                        Renew
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/dashboard/properties/${property.id}/edit`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteProperty}>
                    <input type="hidden" name="id" value={property.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
