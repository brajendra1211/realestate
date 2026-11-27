"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BellRing,
  Building2,
  CalendarClock,
  FileLock2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MapPin,
  Newspaper,
  Radio,
  Receipt,
  Star,
  User,
  UserPlus,
  UserSearch,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

// One clear list, grouped by task. Everything a partner needs is visible, nothing hidden behind a menu.
const HOME: NavItem = { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard };

const GROUPS: NavGroup[] = [
  {
    title: "Work",
    items: [
      { href: "/agent/owner-requests", label: "Owner Requests", icon: BellRing },
      { href: "/agent/buyer-leads", label: "Buyer Leads", icon: UserSearch },
      { href: "/agent/listings", label: "My Listings", icon: Building2 },
      { href: "/agent/gold-feed", label: "Direct Customer Listings", icon: Star },
      { href: "/agent/appointments", label: "Scheduled Visits", icon: CalendarClock },
      { href: "/agent/visits", label: "Site Visits", icon: MapPin },
      { href: "/agent/broadcast", label: "B2B Broadcast", icon: Radio },
      { href: "/agent/digest", label: "Daily Digest", icon: Newspaper },
      { href: "/agent/requirements", label: "Customer requirements", icon: Newspaper },
      { href: "/agent/brochures", label: "Brochure Maker", icon: FileText },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/agent/payments", label: "Earnings & Payments", icon: Wallet },
      { href: "/agent/commissions", label: "Commissions", icon: Receipt },
    ],
  },
  {
    title: "My network",
    items: [
      { href: "/agent/investors", label: "Referral Partners", icon: Users },
      { href: "/agent/investors/new", label: "Register Referral Partner", icon: UserPlus },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/agent/profile", label: "Profile & KYC", icon: User },
      { href: "/agent/documents", label: "Documents", icon: FileLock2 },
      { href: "/support", label: "Support & disputes", icon: LifeBuoy },
    ],
  },
];

export function AgentSidebar({ agentName, logoutButton }: { agentName: string; logoutButton: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/agent/dashboard") return pathname === href;
    if (href === "/agent/investors") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const itemLink = (item: NavItem, key: string, pinned = false) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group relative flex items-center rounded-xl px-3 ${pinned ? "py-3" : "py-2"} text-[13px] font-semibold transition-colors ${
          active ? "text-blue-700" : "text-slate-600 hover:text-blue-700"
        }`}
      >
        {active && (
          <motion.span
            layoutId={`agent-active-${key}`}
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-100 via-blue-50 to-violet-100 ring-1 ring-sky-400/70 shadow-[0_0_20px_rgba(0,153,255,0.35)]"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        {!active && <span className="absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-sky-50" />}
        <span className="relative flex min-w-0 items-center gap-3">
          <Icon
            className={`h-[18px] w-[18px] shrink-0 transition ${
              active ? "text-blue-600 drop-shadow-[0_0_6px_rgba(0,153,255,0.6)]" : "text-slate-400 group-hover:text-blue-600"
            }`}
          />
          <span className="truncate">{item.label}</span>
        </span>
      </Link>
    );
  };

  const navContent = (key: string) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-white text-slate-600 ring-1 ring-sky-400/25">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-sky-400/20 px-5 py-5">
        <Link href="/agent/dashboard" className="flex items-center gap-3">
          <span className="font-display flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-semibold text-white shadow-[0_0_22px_rgba(10,108,255,0.55)]">
            p
          </span>
          <div className="leading-tight">
            <span className="font-display block text-xl font-semibold text-blue-700">
              pronesto<span className="text-sky-500">.</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#39ff88]" /> Channel partner
            </span>
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
        <div className="space-y-1">{itemLink(HOME, key, true)}</div>
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1 border-t border-sky-400/20 pt-4">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
            {group.items.map((item) => itemLink(item, key))}
          </div>
        ))}
      </nav>

      <div className="relative border-t border-sky-400/20 p-3">
        <div className="flex items-center justify-between rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-400/25">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-400 text-sm font-bold text-[#04050d] shadow-[0_0_14px_rgba(255,225,77,0.5)]">
              {agentName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-ink">{agentName}</span>
              <span className="text-[10px] font-semibold text-emerald-600">● Channel Partner</span>
            </div>
          </div>
          <div className="shrink-0">{logoutButton}</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-sky-400/25 bg-white px-4 py-3 text-ink md:hidden">
        <Link href="/agent/dashboard" className="font-display text-lg font-semibold text-blue-700">
          pronesto<span className="text-sky-500">.</span>
          <span className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-sky-600">Partner</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-sky-400/40 text-blue-600 hover:text-blue-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute left-0 top-0 z-10 h-full w-72 max-w-[85vw] shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
              {navContent("mobile")}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="z-20 hidden md:sticky md:top-0 md:block md:h-screen md:w-72 md:shrink-0">
        {navContent("desktop")}
      </aside>
    </>
  );
}
