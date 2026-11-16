"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Users, BookOpenCheck, Wallet, Target, Handshake } from "lucide-react";

const TABS = [
  { href: "/admin/partners?tab=partners", label: "Partners", icon: Users },
  { href: "/admin/partners?tab=commissions", label: "Commissions", icon: BookOpenCheck },
  { href: "/admin/partners?tab=payouts", label: "Payouts", icon: Wallet, badgeKey: "payouts" as const },
  { href: "/admin/deals", label: "Deals", icon: Handshake },
  { href: "/admin/targets", label: "Targets", icon: Target },
];

/** One tab bar that ties together everything about channel partners and their money. */
export function PartnersNav({ pendingPayouts = 0, pendingPartners = 0 }: { pendingPayouts?: number; pendingPartners?: number }) {
  const pathname = usePathname();
  const currentTab = useSearchParams().get("tab") ?? "partners";
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-soft">
      {TABS.map((t) => {
        const [path, qs] = t.href.split("?");
        const active = qs ? pathname === path && qs === `tab=${currentTab}` : pathname === path || pathname.startsWith(`${path}/`);
        const Icon = t.icon;
        const badge = t.badgeKey === "payouts" ? pendingPayouts : t.href.endsWith("tab=partners") ? pendingPartners : 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active ? "text-white" : "text-slate-600 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="partners-tab"
                className="absolute inset-0 rounded-xl bg-brand-600 shadow-md shadow-brand-600/25"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {t.label}
              {badge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] font-black ${
                    active ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                  }`}
                >
                  {badge}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
