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
  TrendingUp,
  Users,
  Mail,
  UserCog,
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
  ShoppingBag,
  LifeBuoy,
  Menu,
  Presentation,
  X,
  FileText,
  ChevronDown,
  Contact,
  BadgeIndianRupee,
  Inbox,
  Wallet,
  Network as NetworkIcon,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type NavGroup = { key: string; title: string; icon: LucideIcon; items: NavItem[] };

// The four screens an admin uses every day stay pinned at the top.
const PINNED: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/people", label: "All people", icon: Contact, badge: "Everyone" },
  { href: "/admin/payment-tracker", label: "Payment tracker", icon: BadgeIndianRupee, badge: "Paid?" },
  { href: "/admin/sales", label: "Sales & monitoring", icon: TrendingUp, badge: "Live" },
  { href: "/admin/live-map", label: "Live map", icon: MapPin, badge: "Live" },
];

// Everything else is folded into five groups that open on demand.
const GROUPS: NavGroup[] = [
  {
    key: "leads",
    title: "Leads & requests",
    icon: Inbox,
    items: [
      { href: "/admin/buyer-leads", label: "Buyer leads", icon: UserSearch },
      { href: "/admin/listing-requests", label: "Owner requests", icon: BellRing },
      { href: "/admin/buy-leads", label: "Buy leads desk", icon: ShoppingBag },
      { href: "/admin/enquiries", label: "Lead inquiries", icon: Mail },
      { href: "/admin/buzzer-control", label: "Buzzer & direct leads", icon: BellRing },
      { href: "/admin/area-routing", label: "Area routing", icon: Route },
      { href: "/admin/support", label: "Support & disputes", icon: LifeBuoy },
    ],
  },
  {
    key: "properties",
    title: "Properties",
    icon: Building2,
    items: [
      { href: "/admin/properties", label: "All properties", icon: Building2 },
      { href: "/admin/gold-listings", label: "Listing moderation", icon: ShieldCheck },
      { href: "/admin/developers", label: "Developers & builders", icon: Landmark },
      { href: "/admin/locations", label: "Metros & localities", icon: MapPin },
      { href: "/admin/amenities", label: "Amenities master", icon: ListChecks },
    ],
  },
  {
    key: "money",
    title: "Money & plans",
    icon: Wallet,
    items: [
      { href: "/admin/deals", label: "Deal closures", icon: Handshake },
      { href: "/admin/investors", label: "Referral partners", icon: TrendingUp },
      { href: "/admin/payments", label: "Payouts & history", icon: CreditCard },
      { href: "/admin/billing", label: "Prime billing", icon: Receipt },
      { href: "/admin/plans", label: "Plans & pricing", icon: Tags },
      { href: "/admin/brochures", label: "Brochure credits", icon: FileText },
    ],
  },
  {
    key: "network",
    title: "Channel partners",
    icon: NetworkIcon,
    items: [
      { href: "/admin/partners", label: "Partners & money", icon: Users },
      { href: "/admin/targets", label: "Partner targets", icon: Target },
      { href: "/admin/prime-expiry", label: "Prime expiry tracker", icon: Crown },
      { href: "/admin/hierarchy", label: "Hierarchy map", icon: Network },
      { href: "/admin/demo", label: "Agent demo", icon: Presentation },
    ],
  },
  {
    key: "system",
    title: "Team & system",
    icon: Wrench,
    items: [
      { href: "/admin/subadmins", label: "Sub-admins & team", icon: UserCog },
      { href: "/admin/analytics", label: "Analytics & traffic", icon: BarChart3 },
      { href: "/admin/documents", label: "Document vault", icon: FileLock2 },
      { href: "/admin/trust", label: "Trust & retention", icon: ShieldCheck },
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

  const isRouteActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // A group stays open while you are inside it; the rest stay folded.
  const activeGroup = GROUPS.find((g) => g.items.some((i) => isRouteActive(i.href)))?.key ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeGroup);

  useEffect(() => {
    setMobileOpen(false);
    if (activeGroup) setOpenKey(activeGroup);
  }, [pathname, activeGroup]);

  const itemLink = (item: NavItem, layoutKey: string, pinned = false) => {
    const active = isRouteActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex items-center justify-between rounded-xl px-3 ${pinned ? "py-3" : "py-2"} text-[13px] font-semibold transition-colors ${
          active ? "text-blue-700" : "text-slate-600 hover:text-blue-700"
        }`}
      >
        {active && (
          <motion.span
            layoutId={`admin-active-${layoutKey}`}
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
        {item.badge && (
          <span
            className={`relative rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              active ? "bg-blue-100 text-blue-700" : "bg-fuchsia-100 text-fuchsia-700"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const navContent = (layoutKey: string) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-white text-slate-600 ring-1 ring-sky-400/25">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-sky-400/20 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="font-display flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-semibold text-white shadow-[0_0_22px_rgba(10,108,255,0.55)]">
            p
          </span>
          <div className="leading-tight">
            <span className="font-display block text-xl font-semibold text-blue-700">
              pronesto<span className="text-sky-500">.</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#39ff88]" /> Admin console
            </span>
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 space-y-4 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#26307a_transparent]">
        <div className="space-y-1">{PINNED.map((item) => itemLink(item, layoutKey, true))}</div>

        <div className="space-y-1 border-t border-sky-400/20 pt-4">
          {GROUPS.map((group) => {
            const open = openKey === group.key;
            const GroupIcon = group.icon;
            const hasActive = group.key === activeGroup;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : group.key)}
                  aria-expanded={open}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] transition ${
                    hasActive ? "text-blue-700" : "text-slate-500 hover:text-blue-700"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <GroupIcon className="h-4 w-4" />
                    {group.title}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sky-400/30 pl-2">
                    {group.items.map((item) => itemLink(item, layoutKey))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t border-sky-400/20 p-3">
        <div className="flex items-center justify-between rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-400/25">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-400 text-sm font-bold text-[#04050d] shadow-[0_0_14px_rgba(255,225,77,0.5)]">
              {adminName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-ink">{adminName}</span>
              <span className="text-[10px] font-semibold text-emerald-600">● Super admin</span>
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
        <Link href="/admin" className="font-display text-lg font-semibold text-blue-700">
          pronesto<span className="text-sky-500">.</span>
          <span className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-sky-600">Admin</span>
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
