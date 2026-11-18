import Link from "next/link";
import { AlarmClock, BellRing, Building2, CalendarClock, ShoppingBag, UserSearch, Users, type LucideIcon } from "lucide-react";
import type { MonitorStats } from "@/lib/salesStats";

type Item = { label: string; value: number; href: string; icon: LucideIcon; urgent?: boolean };

// "What needs attention right now" strip — every tile links to the screen that fixes it.
export function MonitorGrid({ stats }: { stats: MonitorStats }) {
  const items: Item[] = [
    { label: "Properties to approve", value: stats.pendingProperties, href: "/admin/properties", icon: Building2 },
    { label: "Owner requests waiting", value: stats.ownerRequestsWaiting, href: "/admin/listing-requests", icon: BellRing, urgent: true },
    { label: "Buyer leads waiting", value: stats.buyerLeadsWaiting, href: "/admin/buyer-leads", icon: UserSearch, urgent: true },
    { label: "Buy leads not called", value: stats.buyLeadsUncalled, href: "/admin/buy-leads", icon: ShoppingBag, urgent: true },
    { label: "Support past 2h SLA", value: stats.supportOverdue, href: "/admin/support", icon: AlarmClock, urgent: true },
    { label: "Partners not renewed", value: stats.partnersLapsed, href: "/admin/prime-expiry", icon: Users },
    { label: "Agreements ending in 7 days", value: stats.listingsExpiringWeek, href: "/admin/properties", icon: CalendarClock },
  ];
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Needs attention</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {items.map((i) => {
          const hot = i.urgent && i.value > 0;
          const Icon = i.icon;
          return (
            <Link
              key={i.label}
              href={i.href}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${
                hot ? "border-amber-300 bg-amber-50" : "border-slate-200/80 bg-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${hot ? "text-amber-600" : "text-slate-400"}`} />
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">{i.value}</p>
              <p className="text-[11px] font-semibold leading-tight text-slate-500">{i.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
