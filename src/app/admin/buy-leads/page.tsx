import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, PhoneCall, ShoppingBag } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPage, StatCard, Pill, EmptyState, btnPrimary, inputCls } from "@/components/admin/ui";
import { updateBuyLeadAction } from "./actions";

type SearchParams = Promise<{ f?: string }>;

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "HIGH", label: "High priority (₹1 Cr+)" },
  { key: "NEW", label: "Not contacted yet" },
  { key: "DONE", label: "Contacted" },
] as const;

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminBuyLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const { f } = await searchParams;
  const filter = FILTERS.some((x) => x.key === f) ? f! : "ALL";

  const where = {
    purpose: "BUY" as const,
    ...(filter === "HIGH" ? { highPriority: true } : {}),
    ...(filter === "NEW" ? { contactedAt: null } : {}),
    ...(filter === "DONE" ? { contactedAt: { not: null } } : {}),
  };
  const [rows, staff, total, high, pending] = await Promise.all([
    prisma.dispatchRequest.findMany({
      where,
      orderBy: [{ highPriority: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { buyer: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUBADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.dispatchRequest.count({ where: { purpose: "BUY" } }),
    prisma.dispatchRequest.count({ where: { purpose: "BUY", highPriority: true } }),
    prisma.dispatchRequest.count({ where: { purpose: "BUY", contactedAt: null } }),
  ]);
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name;

  return (
    <AdminPage
      title="Buy leads desk"
      description="Every BUY requirement lands here, never with partners. ₹1 Cr+ leads are flagged High Priority. Call the customer and log the outcome."
    >
      <AutoRefresh seconds={20} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total BUY leads" value={total} icon={ShoppingBag} />
        <StatCard label="High priority" value={high} hint="Budget ₹1 Cr+" icon={Flame} tone="amber" />
        <StatCard label="Not contacted" value={pending} hint={pending ? "Call these first" : "All contacted"} icon={PhoneCall} tone="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "ALL" ? "/admin/buy-leads" : `/admin/buy-leads?f=${x.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === x.key ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No BUY leads" text="When a customer submits a BUY requirement, it shows up here." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-3xl border bg-white p-5 shadow-soft ${r.highPriority ? "border-amber-300" : "border-slate-200/80"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">
                    <Link href={`/admin/people/${r.buyer.id}`} className="hover:underline">
                      {r.buyer.name}
                    </Link>
                    {r.highPriority && (
                      <span className="ml-2 align-middle">
                        <Pill tone="amber">High priority</Pill>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {r.societyName ?? "Any society"} · {r.bhk ? `${r.bhk} BHK` : "Any size"} · Budget {r.budgetLabel ?? "—"} · within{" "}
                    {r.selectedRadiusKm} km
                  </p>
                  <p className="text-xs text-slate-400">
                    Submitted {dt(r.createdAt)} · {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                  </p>
                </div>
                {r.buyer.phone && (
                  <a
                    href={`tel:${r.buyer.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
                  >
                    <PhoneCall className="h-4 w-4" /> Call {r.buyer.phone}
                  </a>
                )}
              </div>
              <form action={updateBuyLeadAction} className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="id" value={r.id} />
                <select name="staffId" defaultValue={r.staffId ?? ""} className={`${inputCls} !w-52`}>
                  <option value="">Assign staff…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role === "ADMIN" ? "Admin" : "Staff"})
                    </option>
                  ))}
                </select>
                <input name="staffNote" defaultValue={r.staffNote ?? ""} placeholder="Call notes / outcome" className={`${inputCls} !w-72 flex-1`} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" name="contacted" defaultChecked={!!r.contactedAt} className="h-4 w-4 accent-brand-600" /> Contacted
                </label>
                <button type="submit" className={btnPrimary}>
                  Save
                </button>
                {r.contactedAt && (
                  <span className="text-xs text-slate-400">
                    Called {dt(r.contactedAt)}
                    {staffName(r.staffId) ? ` by ${staffName(r.staffId)}` : ""}
                  </span>
                )}
              </form>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
