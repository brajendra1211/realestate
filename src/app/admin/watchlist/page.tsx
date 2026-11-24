import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, Pill, EmptyState } from "@/components/admin/ui";

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminWatchlistPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
  const rows = await prisma.watchRequirement.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const buyers = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.buyerId))] } },
    select: { id: true, name: true, phone: true },
  });
  const byId = new Map(buyers.map((b) => [b.id, b]));
  return (
    <AdminPage
      title="Requirement watch-list"
      description="Customer requirements with no match yet stay here. When a matching property is listed, the customer and agent are alerted automatically."
    >
      {rows.length === 0 ? (
        <EmptyState icon={Radar} title="Watch-list is empty" text="Unmatched requirements appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const b = byId.get(r.buyerId);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {b?.name ?? "Customer"}{" "}
                    {b?.phone && (
                      <a href={`tel:${b.phone}`} className="ml-2 text-brand-600">
                        {b.phone}
                      </a>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {r.purpose} · {r.bhk ? `${r.bhk} BHK` : "Any size"} · {r.societyName ?? "Any society"} · within {r.radiusKm} km
                    {r.budgetMax ? ` · up to ₹${r.budgetMax.toLocaleString("en-IN")}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    Saved {dt(r.createdAt)}
                    {r.matchedAt ? ` · matched ${dt(r.matchedAt)}` : ""}
                  </p>
                </div>
                <Pill tone={r.status === "ACTIVE" ? "amber" : r.status === "MATCHED" ? "green" : "slate"}>{r.status}</Pill>
              </div>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
