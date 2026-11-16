import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, Phone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formLink, REQUEST_STATUS_LABEL, visibleToAgentWhere } from "@/lib/listingRequest";
import { formatINR } from "@/lib/format";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ShareLinkButtons } from "./ShareLinkButtons";

const tone: Record<string, string> = {
  ACCEPTED: "bg-amber-50 text-amber-700 ring-amber-200",
  LINK_SENT: "bg-sky-50 text-sky-700 ring-sky-200",
  SUBMITTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function OwnerRequestsPage() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!agent) redirect("/login");

  const [waiting, mine] = await Promise.all([
    prisma.listingRequest.findMany({
      where: visibleToAgentWhere(agent.id),
      orderBy: { createdAt: "desc" },
    }),
    prisma.listingRequest.findMany({
      where: { acceptedByAgentId: agent.id },
      orderBy: { acceptedAt: "desc" },
      take: 50,
      include: { agentListing: { select: { slug: true } } },
    }),
  ]);
  const active = mine.filter((r) => r.status === "ACCEPTED" || r.status === "LINK_SENT");
  const done = mine.filter((r) => r.status === "SUBMITTED" || r.status === "CANCELLED");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Owner requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Owners who paid to list a rental. Accept first, call them, send your link, and the listing goes live under your ID.
          You earn the partner share of the plan fee when they submit their details.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <BellRing className="h-4 w-4" /> Waiting for a partner ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No new requests right now. When an owner pays, you will get a buzzer here instantly.
          </p>
        ) : (
          waiting.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-gold-400 bg-white p-4 shadow-soft">
              <div>
                <p className="font-bold text-ink">New owner in {[r.locality, r.city].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-slate-500">
                  {r.plan === "GOLD" ? "Gold" : "Basic"} plan · you earn {formatINR(r.agentSplit)}
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-500">Use the buzzer on screen to accept</p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My active requests ({active.length})</h2>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Nothing in progress.</p>
        ) : (
          active.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">{r.ownerName}</p>
                  <p className="text-sm text-slate-500">
                    {[r.locality, r.city].filter(Boolean).join(", ")} · {r.plan === "GOLD" ? "Gold" : "Basic"} · you earn {formatINR(r.agentSplit)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${tone[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                <a href={`tel:${r.ownerPhone}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
                  <Phone className="h-4 w-4" /> Call {r.ownerPhone}
                </a>
                <ShareLinkButtons requestId={r.id} link={formLink(r)} ownerName={r.ownerName} phone={r.ownerPhone} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {r.status === "LINK_SENT"
                  ? "Link sent. We will notify you as soon as the owner submits the details."
                  : "Call the owner first, then send the link so they can fill in the property details."}
              </p>
            </div>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Completed</h2>
          {done.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <div>
                <p className="font-bold text-ink">{r.ownerName}</p>
                <p className="text-xs text-slate-500">{[r.locality, r.city].filter(Boolean).join(", ")}</p>
              </div>
              <div className="flex items-center gap-3">
                {r.agentListing && (
                  <Link href={`/listings/${r.agentListing.slug}`} className="text-xs font-bold text-brand-600 hover:underline">
                    View listing
                  </Link>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${tone[r.status]}`}>
                  {r.status === "SUBMITTED" && <CheckCircle2 className="h-3 w-3" />}
                  {REQUEST_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
