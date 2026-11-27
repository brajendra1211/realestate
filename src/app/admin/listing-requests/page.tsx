import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, Clock, IndianRupee, Link2, Phone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { REQUEST_STATUS_LABEL, VERIFY_WITHIN_MS, advanceListingRequests, formLink } from "@/lib/listingRequest";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPage, StatCard, Pill, EmptyState, btnGhost, btnPrimary, btnDanger, inputCls } from "@/components/admin/ui";
import { assignRequestAction, realertRequestAction, cancelRequestAction, completeRequestAction } from "./actions";

type SearchParams = Promise<{ status?: string }>;

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ADMIN_DESK", label: "Sell desk (admin only)" },
  { key: "DETAILS_PENDING", label: "Owner adding details" },
  { key: "SEARCHING", label: "Waiting for partner" },
  { key: "ACCEPTED", label: "Partner to verify" },
  { key: "SUBMITTED", label: "Listed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const tone = {
  PENDING_PAYMENT: "slate",
  DETAILS_PENDING: "slate",
  SEARCHING: "amber",
  ACCEPTED: "blue",
  LINK_SENT: "violet",
  SUBMITTED: "green",
  CANCELLED: "red",
  ADMIN_DESK: "violet",
} as const;

/** True when a pending verification is more than 75% through its 48 h window. */
const nearDeadline = (since: Date) => Date.now() - since.getTime() > VERIFY_WITHIN_MS * 0.75;

const dt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function AdminListingRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { status } = await searchParams;
  await advanceListingRequests().catch(() => 0); // 5/10/15 km widening and the 48 h auto re-buzz
  const filter = FILTERS.some((f) => f.key === status) ? status! : "ALL";

  const [requests, counts, agents] = await Promise.all([
    prisma.listingRequest.findMany({
      where: { status: filter === "ALL" ? { not: "PENDING_PAYMENT" } : (filter as never) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        acceptedAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
        agentListing: { select: { slug: true } },
      },
    }),
    prisma.listingRequest.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.agentProfile.findMany({
      where: { status: "APPROVED", primeStatus: true },
      select: { id: true, agentCode: true, city: true, user: { select: { name: true } } },
      orderBy: { agentCode: "asc" },
    }),
  ]);

  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const paid = counts.filter((c) => c.status !== "PENDING_PAYMENT" && c.status !== "CANCELLED").reduce((t, c) => t + (c._sum.amount ?? 0), 0);

  return (
    <AdminPage
      title="Owner listing requests"
      description="Owners pay for a plan, the nearest partners are buzzed, the first to accept calls the owner and sends the details link."
    >
      <AutoRefresh seconds={15} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Sell desk (admin only)" value={n("ADMIN_DESK")} hint={n("ADMIN_DESK") ? "Owners who want to SELL" : "No sell requests waiting"} icon={BellRing} tone="rose" />
        <StatCard label="Waiting for partner" value={n("SEARCHING")} hint={n("SEARCHING") ? "Needs attention" : "All picked up"} icon={BellRing} tone="amber" />
        <StatCard label="In progress" value={n("ACCEPTED") + n("LINK_SENT")} hint="Partner is on it" icon={Clock} tone="violet" />
        <StatCard label="Listed" value={n("SUBMITTED")} hint="Owner filled the details" icon={CheckCircle2} tone="green" />
        <StatCard label="Plan fees collected" value={formatINR(paid)} hint="Excluding cancelled" icon={IndianRupee} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ALL" ? "/admin/listing-requests" : `/admin/listing-requests?status=${f.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.key ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
            }`}
          >
            {f.label}
            {f.key !== "ALL" && <span className="ml-1.5 text-xs opacity-60">{n(f.key)}</span>}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={BellRing} title="No requests here" text="Paid owner requests will show up here the moment they come in." />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">{r.ownerName}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                    <a href={`tel:${r.ownerPhone}`} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {r.ownerPhone}
                    </a>
                    <span>{[r.locality, r.city].filter(Boolean).join(", ")}</span>
                    {r.ownerEmail && <span>{r.ownerEmail}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.purpose === "SELL" ? "red" : "green"}>{r.purpose === "SELL" ? "SELL · admin only" : "RENT"}</Pill>
                  <Pill tone={r.plan === "GOLD" ? "violet" : "blue"}>{r.plan === "GOLD" ? "Pro" : "Basic"} · {formatINR(r.amount)}</Pill>
                  <Pill tone={tone[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Pill>
                </div>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</dt>
                  <dd className="font-semibold">{dt(r.paidAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Partner</dt>
                  <dd className="font-semibold">
                    {r.purpose === "SELL" ? "None (admin team only)" : r.acceptedAgent ? `${r.acceptedAgent.user.name} (${r.acceptedAgent.agentCode})` : "Not accepted yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Split</dt>
                  <dd className="font-semibold">
                    Partner {formatINR(r.agentSplit)} · Company {formatINR(r.companySplit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details in / accepted</dt>
                  <dd className="font-semibold">
                    {dt(r.detailsAt)} / {dt(r.acceptedAt)}
                  </dd>
                </div>
              </dl>

              {r.purpose !== "SELL" && (r.status === "SEARCHING" || r.status === "ACCEPTED") && r.detailsAt && (
                <p
                  className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${
                    nearDeadline(r.acceptedAt ?? r.searchStartedAt ?? r.detailsAt)
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  Owner is waiting: not verified yet.{" "}
                  {r.status === "SEARCHING"
                    ? `Buzzer radius ${r.buzzRadiusKm || 5} km, ${r.buzzCount} buzz${r.buzzCount === 1 ? "" : "es"}, nobody has accepted.`
                    : "A partner accepted and has to verify on site (auto re-buzz after 48 h)."}
                </p>
              )}

              {r.agentListing && (
                <Link href={`/listings/${r.agentListing.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline">
                  <Link2 className="h-4 w-4" /> View the listing
                </Link>
              )}

              {r.status !== "SUBMITTED" && r.status !== "CANCELLED" && r.status !== "PENDING_PAYMENT" && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  {r.status === "ADMIN_DESK" && (
                    <form action={completeRequestAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="note" placeholder="Note (e.g. listing created)" className={`${inputCls} !w-56`} />
                      <button type="submit" className={btnPrimary}>Mark as handled</button>
                      <Link href="/admin/properties/new" className={btnGhost}>Add the property</Link>
                    </form>
                  )}
                  {r.purpose !== "SELL" && (
                  <form action={assignRequestAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <select name="agentId" required defaultValue="" className={`${inputCls} !w-72`}>
                      <option value="" disabled>Assign to a partner…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.user.name} ({a.agentCode}){a.city ? ` · ${a.city}` : ""}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={btnPrimary}>Assign</button>
                  </form>
                  )}
                  {r.status === "SEARCHING" && (
                    <form action={realertRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={btnGhost}>
                        <BellRing className="h-4 w-4" /> Buzz partners again
                      </button>
                    </form>
                  )}
                  {r.status !== "SEARCHING" && r.purpose !== "SELL" && (
                    <form action={assignRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={btnGhost}>Reopen search</button>
                    </form>
                  )}
                  <form action={cancelRequestAction} className="ml-auto flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="note" placeholder="Reason (optional)" className={`${inputCls} !w-44`} />
                    <button type="submit" className={btnDanger}>Cancel</button>
                  </form>
                </div>
              )}
              {(r.status === "ACCEPTED" || r.status === "LINK_SENT" || r.status === "DETAILS_PENDING") && !r.detailsJson ? (
                <p className="mt-3 break-all text-xs text-slate-400">Owner link: {formLink(r)}</p>
              ) : null}
              {r.adminNote && <p className="mt-2 text-xs text-slate-500">Note: {r.adminNote}</p>}
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
