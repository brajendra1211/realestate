import Link from "next/link";
import {
  Users,
  Clock,
  Crown,
  Wallet,
  Search,
  MapPin,
  Phone,
  Mail,
  FileText,
  Star,
  BookOpenCheck,
  CheckCircle2,
  XCircle,
  UserX,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { formatINR } from "@/lib/format";
import { approveAgentAction, rejectAgentAction, activatePrimeAction } from "../agents/actions";
import { setAgentAutoTypesAction } from "./actions";
import { parseTypes } from "@/lib/commissionMode";
import {
  StatCard,
  Pill,
  EmptyState,
  Notice,
  btnSuccess,
  btnDanger,
  btnPrimary,
  btnGhost,
  inputCls,
} from "@/components/admin/ui";

const DOC_LABELS: Record<string, string> = {
  RERA_CERTIFICATE: "RERA certificate",
  TRADE_LICENSE: "Trade license",
  GST_CERTIFICATE: "GST certificate",
  OTHER: "Document",
};

const COMMISSION_TYPES: [string, string][] = [
  ["BROKERAGE", "Deal brokerage"],
  ["UNLOCK_SPLIT", "Contact unlock split"],
  ["GOLD_SPLIT", "Gold listing split"],
  ["DEAL_PROFIT_SHARE", "Referral Partner deal profit"],
  ["REGISTRATION_REFERRAL", "Referral Partner joining referral"],
  ["AGENT_REFERRAL", "Partner referral"],
  ["CUSTOMER_PROPERTY_UPDATE", "Property update split"],
  ["REFERRAL_CUSTOMER_RENEWAL", "Renewal royalty"],
  ["COMPANY_FIVE_STAR_REWARD", "5-star rating reward"],
];

type SearchParams = Promise<Record<string, string | undefined>>;

export async function PartnersTab({ searchParams }: { searchParams: SearchParams }) {
  const { status, q, saved, error } = await searchParams;
  const filterStatus = status === "APPROVED" || status === "REJECTED" || status === "ALL" ? status : "PENDING";
  const query = q?.trim() ?? "";

  const where: Prisma.AgentProfileWhereInput = {
    ...(filterStatus === "ALL" ? {} : { status: filterStatus }),
    ...(query
      ? {
          OR: [
            { agentCode: { contains: query } },
            { shopName: { contains: query } },
            { city: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
            { user: { phone: { contains: query } } },
          ],
        }
      : {}),
  };

  const [agents, plans, statusCounts, walletAgg, primeCount] = await Promise.all([
    prisma.agentProfile.findMany({
      where,
      include: { user: true, documents: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.plan.findMany({ where: { active: true, role: { in: ["AGENT", "BOTH"] } }, orderBy: { price: "asc" } }),
    prisma.agentProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.agentProfile.aggregate({ _sum: { walletBalance: true } }),
    prisma.agentProfile.count({ where: { primeStatus: true } }),
  ]);

  const earned = agents.length
    ? await prisma.commissionLedgerEntry.groupBy({
        by: ["agentId"],
        where: { agentId: { in: agents.map((a) => a.id) } },
        _sum: { amount: true },
      })
    : [];
  const earnedMap = new Map(earned.map((e) => [e.agentId, e._sum.amount ?? 0]));

  const count = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const total = statusCounts.reduce((n, c) => n + c._count._all, 0);
  const pending = count("PENDING");

  const tabs = [
    { key: "PENDING", label: "Needs review", n: pending },
    { key: "APPROVED", label: "Approved", n: count("APPROVED") },
    { key: "REJECTED", label: "Rejected", n: count("REJECTED") },
    { key: "ALL", label: "All", n: total },
  ];
  const link = (s: string) => `/admin/partners?tab=partners&status=${s}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total partners" value={total} hint={`${count("APPROVED")} approved`} icon={Users} />
        <StatCard
          label="Awaiting review"
          value={pending}
          hint={pending ? "Approve or reject below" : "All caught up"}
          icon={Clock}
          tone="amber"
        />
        <StatCard label="Prime active" value={primeCount} hint="Paying partners" icon={Crown} tone="violet" />
        <StatCard
          label="Wallet balance owed"
          value={formatINR(walletAgg._sum.walletBalance ?? 0)}
          hint="Across all partners"
          icon={Wallet}
          tone="green"
        />
      </div>

      {saved === "1" && <Notice tone="green">Saved.</Notice>}
      {error && (
        <Notice tone="red">
          {error === "plan" ? "Select a plan to activate Prime." : `Could not complete action: ${error}`}
        </Notice>
      )}

      {/* Search + status tabs */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={link(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filterStatus === t.key
                  ? "bg-ink text-white shadow"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-700"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                  filterStatus === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.n}
              </span>
            </Link>
          ))}
        </div>

        <form method="get" className="flex w-full gap-2 lg:w-96">
          <input type="hidden" name="tab" value="partners" />
          <input type="hidden" name="status" value={filterStatus} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name, code, phone, city…"
              className={`${inputCls} pl-10`}
            />
          </div>
          <button type="submit" className={btnPrimary}>
            Search
          </button>
        </form>
      </div>

      {/* Partner cards */}
      {agents.length === 0 ? (
        <EmptyState
          icon={UserX}
          title="No partners found"
          text={query ? "Try a different search or status." : "Nothing in this status right now."}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {agents.map((agent) => {
            const name = agent.shopName ?? agent.user.name;
            const totalEarned = earnedMap.get(agent.id) ?? 0;
            return (
              <div key={agent.id} className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 text-lg font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-bold text-ink"><Link href={`/admin/people/${agent.userId}`} className="hover:text-brand-600 hover:underline">{name}</Link></p>
                      {agent.agentCode && (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                          {agent.agentCode}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {agent.status === "PENDING" && <Pill tone="amber">Needs review</Pill>}
                      {agent.status === "APPROVED" && <Pill tone="green">Approved</Pill>}
                      {agent.status === "REJECTED" && <Pill tone="red">Rejected</Pill>}
                      {agent.primeStatus ? <Pill tone="violet">Prime</Pill> : agent.status === "APPROVED" && <Pill>No Prime</Pill>}
                      {agent.ratingAvg ? (
                        <Pill tone="amber">
                          <Star className="h-3 w-3 fill-current" /> {agent.ratingAvg.toFixed(1)}
                        </Pill>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{agent.user.email}</span></p>
                  {agent.user.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{agent.user.phone}</p>}
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{[agent.city, agent.shopAddress].filter(Boolean).join(" · ") || "No address given"}</span></p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wallet</p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-700">{formatINR(agent.walletBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total earned</p>
                    <p className="mt-0.5 text-sm font-bold text-ink">{formatINR(totalEarned)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Experience</p>
                    <p className="mt-0.5 text-sm font-bold text-ink">{agent.yearsExperience != null ? `${agent.yearsExperience} yrs` : "—"}</p>
                  </div>
                </div>

                {(agent.reraNumber || agent.gstNumber || agent.documents.length > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {agent.reraNumber && <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600">RERA {agent.reraNumber}</span>}
                    {agent.gstNumber && <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600">GST {agent.gstNumber}</span>}
                    {agent.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-brand-700 transition hover:bg-brand-100"
                      >
                        <FileText className="h-3 w-3" /> {DOC_LABELS[doc.type]}
                      </a>
                    ))}
                  </div>
                )}

                {agent.status === "REJECTED" && agent.rejectionReason && (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    Reason: {agent.rejectionReason}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {agent.status === "PENDING" && (
                    <>
                      <form action={approveAgentAction}>
                        <input type="hidden" name="id" value={agent.id} />
                        <button type="submit" className={btnSuccess}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </button>
                      </form>
                      <form action={rejectAgentAction} className="flex flex-1 items-center gap-2">
                        <input type="hidden" name="id" value={agent.id} />
                        <input
                          type="text"
                          name="reason"
                          required
                          placeholder="Reason to reject…"
                          className={`${inputCls} min-w-[140px] flex-1`}
                        />
                        <button type="submit" className={btnDanger}>
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </form>
                    </>
                  )}
                  {agent.status === "APPROVED" && !agent.primeStatus && (
                    <form action={activatePrimeAction} className="flex flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={agent.id} />
                      <select name="planId" required defaultValue="" className={`${inputCls} min-w-[160px] flex-1`}>
                        <option value="" disabled>
                          Select Prime plan…
                        </option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} (₹{plan.price.toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={btnPrimary}>
                        <Crown className="h-4 w-4" /> Activate Prime
                      </button>
                    </form>
                  )}
                  {agent.status === "APPROVED" && (
                    <details className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm">
                      <summary className="cursor-pointer font-bold text-ink">
                        Commission control
                        {parseTypes(agent.manualCommissionTypes).size > 0 && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                            {parseTypes(agent.manualCommissionTypes).size} manual
                          </span>
                        )}
                      </summary>
                      <form action={setAgentAutoTypesAction} className="mt-3 space-y-2">
                        <input type="hidden" name="agentId" value={agent.id} />
                        <p className="text-xs text-slate-500">Ticked = credited automatically. Unticked = you credit it by hand for this partner.</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {COMMISSION_TYPES.map(([key, label]) => (
                            <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                name="auto"
                                value={key}
                                defaultChecked={!parseTypes(agent.manualCommissionTypes).has(key)}
                                className="h-4 w-4 accent-emerald-600"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <button type="submit" className={btnPrimary}>Save</button>
                      </form>
                    </details>
                  )}
                  {agent.status === "APPROVED" && (
                    <Link href={`/admin/partners?tab=commissions&agentId=${agent.id}`} className={btnGhost}>
                      <BookOpenCheck className="h-4 w-4" /> Commissions
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
