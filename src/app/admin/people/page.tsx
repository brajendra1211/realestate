import { CreateUserCard } from "./ManageUser";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Contact, Search } from "lucide-react";
import type { Prisma, Role } from "@/generated/prisma";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, EmptyState, inputCls } from "@/components/admin/ui";

type SearchParams = Promise<{ role?: string; f?: string; q?: string; page?: string; error?: string; deleted?: string }>;

const PAGE_SIZE = 40;

// Role tabs shown to the admin. "TEAM" bundles admins and sub-admins.
const TABS = [
  { key: "all", label: "Everyone" },
  { key: "AGENT", label: "Channel partners" },
  { key: "INVESTOR", label: "Referral partners" },
  { key: "OWNER", label: "Owners" },
  { key: "BUYER", label: "Buyers" },
  { key: "TEAM", label: "Team" },
] as const;

const ROLE_CHIP: Record<string, { label: string; cls: string }> = {
  AGENT: { label: "Channel partner", cls: "is-cyan" },
  INVESTOR: { label: "Referral partner", cls: "is-violet" },
  OWNER: { label: "Owner", cls: "is-green" },
  BUYER: { label: "Buyer", cls: "is-muted" },
  ADMIN: { label: "Admin", cls: "is-red" },
  SUBADMIN: { label: "Sub-admin", cls: "is-red" },
};

const date = (d: Date) => d.toLocaleDateString("en-IN", { dateStyle: "medium" });

function roleWhere(role: string): Prisma.UserWhereInput {
  if (role === "TEAM") return { role: { in: ["ADMIN", "SUBADMIN"] } };
  if (role === "all") return {};
  return { role: role as Role };
}

function link(p: { role?: string; f?: string; q?: string; page?: number }) {
  const s = new URLSearchParams();
  if (p.role && p.role !== "all") s.set("role", p.role);
  if (p.f && p.f !== "all") s.set("f", p.f);
  if (p.q) s.set("q", p.q);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const str = s.toString();
  return `/admin/people${str ? `?${str}` : ""}`;
}

export default async function AdminPeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const role = TABS.some((t) => t.key === sp.role) ? (sp.role as string) : "all";
  const f = ["unpaid", "pending", "active"].includes(sp.f ?? "") ? (sp.f as string) : "all";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  // Quick filters answer the questions an admin actually asks.
  const now = new Date();
  const filterWhere: Prisma.UserWhereInput =
    f === "unpaid"
      ? {
          OR: [
            { role: "AGENT", agentProfile: { is: { agentCode: null } } },
            { role: "INVESTOR", investorProfile: { is: { feeStatus: "PENDING" } } },
          ],
        }
      : f === "pending"
        ? { role: "AGENT", agentProfile: { is: { status: "PENDING" } } }
        : f === "active"
          ? { subscriptions: { some: { status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gte: now } }] } } }
          : {};

  const searchWhere: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { agentProfile: { is: { agentCode: { contains: q } } } },
          { investorProfile: { is: { investorCode: { contains: q } } } },
        ],
      }
    : {};

  const where: Prisma.UserWhereInput = { AND: [roleWhere(role), filterWhere, searchWhere] };

  const [users, total, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        createdAt: true,
        agentProfile: { select: { agentCode: true, status: true, primeStatus: true, city: true } },
        investorProfile: { select: { investorCode: true, feeStatus: true } },
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { endDate: true, plan: { select: { name: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  // Owners pay through a listing request (not a subscription): paid = a request with a payment date.
  const ownerIds = users.filter((u) => u.role === "OWNER").map((u) => u.id);
  const ownerRequests = ownerIds.length
    ? await prisma.listingRequest.findMany({
        where: { userId: { in: ownerIds }, paidAt: { not: null } },
        orderBy: { paidAt: "desc" },
        select: { userId: true, plan: true, status: true },
      })
    : [];
  const paidByOwner = new Map<string, { plan: string; status: string }>();
  for (const r of ownerRequests) if (r.userId && !paidByOwner.has(r.userId)) paidByOwner.set(r.userId, r);

  const countOf = (key: string) =>
    key === "all"
      ? counts.reduce((s, c) => s + c._count._all, 0)
      : key === "TEAM"
        ? counts.filter((c) => c.role === "ADMIN" || c.role === "SUBADMIN").reduce((s, c) => s + c._count._all, 0)
        : (counts.find((c) => c.role === key)?._count._all ?? 0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminPage
      title="All people"
      description="Every account on the platform in one list. Click anyone to see their full details, documents, wallet and payments."
    >
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{sp.error}</p>}
      {sp.deleted && <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">User deleted.</p>}
      <CreateUserCard />

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === role;
          return (
            <Link
              key={t.key}
              href={link({ role: t.key })}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-sky-500 bg-sky-50 text-ink shadow-[0_0_18px_rgba(0,200,255,0.4)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-400"
              }`}
            >
              {t.label} <span className="ml-1 text-xs font-semibold text-slate-400">{countOf(t.key)}</span>
            </Link>
          );
        })}
      </div>

      <section className="neon-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "unpaid", label: "Not paid yet", cls: "is-red" },
              { key: "pending", label: "Waiting for verification", cls: "is-yellow" },
              { key: "active", label: "Plan active", cls: "is-green" },
            ].map((x) => (
              <Link
                key={x.key}
                href={link({ role, f: x.key, q })}
                className={`neon-chip ${f === x.key ? (x.cls ?? "is-cyan") : "is-muted"}`}
              >
                {x.label}
              </Link>
            ))}
          </div>
          <form action="/admin/people" className="relative">
            {role !== "all" && <input type="hidden" name="role" value={role} />}
            {f !== "all" && <input type="hidden" name="f" value={f} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input name="q" defaultValue={q} placeholder="Search name, phone, email or code…" className={`${inputCls} w-full pl-9 lg:w-80`} />
          </form>
        </div>

        {users.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon={Contact} title="No one found" text="Try a different tab, filter or search." />
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-cyan-400/15">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-400/10">
                {users.map((u) => {
                  const chip = ROLE_CHIP[u.role] ?? { label: u.role, cls: "is-muted" };
                  const sub = u.subscriptions[0];
                  const planLive = !!sub && (!sub.endDate || sub.endDate >= now);

                  let pay: { cls: string; label: string } = { cls: "is-muted", label: "—" };
                  if (u.role === "AGENT") {
                    pay = u.agentProfile?.agentCode
                      ? planLive
                        ? { cls: "is-green", label: `✓ Plan active${sub?.endDate ? ` · till ${date(sub.endDate)}` : ""}` }
                        : { cls: "is-yellow", label: "Plan expired" }
                      : { cls: "is-red", label: "✕ Not paid" };
                  } else if (u.role === "INVESTOR") {
                    pay =
                      u.investorProfile?.feeStatus === "PAID"
                        ? { cls: "is-green", label: "✓ Fee paid" }
                        : { cls: "is-red", label: "✕ Fee pending" };
                  } else if (u.role === "OWNER") {
                    const paid = paidByOwner.get(u.id);
                    pay = paid
                      ? { cls: "is-green", label: `✓ ${paid.plan === "GOLD" ? "Pro" : "Basic"} listing paid` }
                      : planLive
                        ? { cls: "is-green", label: `✓ ${sub?.plan.name ?? "Plan active"}` }
                        : { cls: "is-muted", label: "No plan" };
                  }

                  let verify: { cls: string; label: string } = { cls: "is-muted", label: "—" };
                  if (u.role === "AGENT") {
                    const st = u.agentProfile?.status;
                    verify =
                      st === "APPROVED"
                        ? { cls: "is-green", label: "Approved" }
                        : st === "REJECTED"
                          ? { cls: "is-red", label: "Rejected" }
                          : { cls: "is-yellow", label: "Pending" };
                  } else if (u.role === "OWNER") {
                    verify = u.verified || paidByOwner.has(u.id) ? { cls: "is-green", label: "Verified" } : { cls: "is-yellow", label: "Not verified" };
                  } else if (u.role === "INVESTOR") {
                    verify = u.investorProfile?.feeStatus === "PAID" ? { cls: "is-green", label: "Active" } : { cls: "is-yellow", label: "Awaiting fee" };
                  }

                  const code = u.agentProfile?.agentCode ?? u.investorProfile?.investorCode ?? null;

                  return (
                    <tr key={u.id} className="group">
                      <td className="px-4 py-3">
                        <Link href={`/admin/people/${u.id}`} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 text-sm font-bold text-sky-700 ring-1 ring-cyan-300/30">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-ink group-hover:text-sky-600">{u.name}</span>
                            <span className="block truncate text-xs text-slate-400">{u.phone ?? u.email ?? "—"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`neon-chip ${chip.cls}`}>{chip.label}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`neon-chip ${pay.cls}`}>{pay.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`neon-chip ${verify.cls}`}>{verify.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{date(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/people/${u.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800">
                          Details <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              {total} people · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link className="neon-chip is-cyan" href={link({ role, f, q, page: page - 1 })}>
                  ← Previous
                </Link>
              )}
              {page < pages && (
                <Link className="neon-chip is-cyan" href={link({ role, f, q, page: page + 1 })}>
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
