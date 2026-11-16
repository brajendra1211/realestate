"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  ShieldCheck,
  Landmark,
  MapPin,
  ListChecks,
  Handshake,
  BookOpenCheck,
  TrendingUp,
  Wallet,
  Users,
  Mail,
  UserRound,
  UserCog,
  HeartHandshake,
  FileLock2,
  Settings,
  CreditCard,
  Receipt,
  Tags,
  Target,
  Crown,
  Network,
  Route,
  Globe,
  Activity,
  BellRing,
  UserSearch,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type NavGroup = { title: string; items: NavItem[] };

const ADMIN_GROUPS: NavGroup[] = [
  {
    title: "Command center",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics & traffic", icon: BarChart3 },
    ],
  },
  {
    title: "Inventory & assets",
    items: [
      { href: "/admin/properties", label: "All properties", icon: Building2, badge: "Live" },
      { href: "/admin/listing-requests", label: "Owner requests", icon: BellRing },
      { href: "/admin/buyer-leads", label: "Buyer leads", icon: UserSearch },
      { href: "/admin/gold-listings", label: "Listing moderation", icon: ShieldCheck },
      { href: "/admin/developers", label: "Developers & builders", icon: Landmark },
      { href: "/admin/locations", label: "Metros & localities", icon: MapPin },
      { href: "/admin/amenities", label: "Amenities master", icon: ListChecks },
    ],
  },
  {
    title: "Commissions & deals",
    items: [
      { href: "/admin/deals", label: "Deal closures", icon: Handshake },
      { href: "/admin/investors", label: "Investors", icon: TrendingUp },
      { href: "/admin/payments", label: "Payments & history", icon: CreditCard },
      { href: "/admin/billing", label: "Prime billing", icon: Receipt },
      { href: "/admin/plans", label: "Plans & pricing", icon: Tags },
    ],
  },
  {
    title: "Network & stakeholders",
    items: [
      { href: "/admin/partners", label: "Channel partners & money", icon: Users },
      { href: "/admin/targets", label: "Partner targets", icon: Target },
      { href: "/admin/prime-expiry", label: "Prime expiry tracker", icon: Crown },
      { href: "/admin/hierarchy", label: "Hierarchy map", icon: Network },
      { href: "/admin/area-routing", label: "Area routing", icon: Route },
      { href: "/admin/enquiries", label: "Lead inquiries", icon: Mail },
      { href: "/admin/users", label: "Owners & dealers", icon: UserRound },
      { href: "/admin/buyers", label: "Buyers directory", icon: HeartHandshake },
      { href: "/admin/subadmins", label: "Sub-admins & team", icon: UserCog },
    ],
  },
  {
    title: "System & platform",
    items: [
      { href: "/admin/trust", label: "Trust & retention", icon: ShieldCheck },
      { href: "/admin/documents", label: "Document vault", icon: FileLock2 },
      { href: "/admin/sitemap", label: "Sitemap", icon: Globe },
      { href: "/health", label: "Server & DB health", icon: Activity },
      { href: "/admin/settings", label: "Website settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({
  adminName,
  logoutButton,
}: {
  adminName: string;
  logoutButton: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isRouteActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (layoutKey: string) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-brand-950 text-slate-300">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="font-display flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-semibold text-white shadow-lg shadow-brand-600/30">
            p
          </span>
          <div className="leading-tight">
            <span className="font-display block text-xl font-semibold text-white">
              pronesto<span className="text-gold-400">.</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Admin console
            </span>
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#1e2a52_transparent]">
        {ADMIN_GROUPS.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isRouteActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                    active ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={`admin-active-${layoutKey}`}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-600/30"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-white/5" />
                  )}
                  <span className="relative flex min-w-0 items-center gap-3">
                    <Icon className={`h-[18px] w-[18px] shrink-0 transition ${active ? "text-white" : "text-slate-500 group-hover:text-brand-300"}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className={`relative rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${active ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/5 p-3">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 text-sm font-bold text-ink">
              {adminName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-white">{adminName}</span>
              <span className="text-[10px] font-semibold text-emerald-400">● Super admin</span>
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
      <div className="flex items-center justify-between border-b border-white/5 bg-brand-950 px-4 py-3 text-white md:hidden">
        <Link href="/admin" className="font-display text-lg font-semibold">
          pronesto<span className="text-gold-400">.</span>
          <span className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
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
                className="absolute right-3 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-white"
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
