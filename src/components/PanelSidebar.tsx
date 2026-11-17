"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X, ArrowLeft } from "lucide-react";

export type PanelNavItem = { href: string; label: string; icon: ReactNode };
export type PanelNavGroup = { label: string; items: PanelNavItem[] };
export type PanelNavEntry = PanelNavItem | PanelNavGroup;

function isGroup(entry: PanelNavEntry): entry is PanelNavGroup {
  return "items" in entry;
}

function isActive(pathname: string, href: string, indexHref: string) {
  if (href === indexHref) return pathname === indexHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActiveItem(pathname: string, group: PanelNavGroup, indexHref: string) {
  return group.items.some((item) => isActive(pathname, item.href, indexHref));
}

function NavLink({
  item,
  active,
  indent,
  pillId,
}: {
  item: PanelNavItem;
  active: boolean;
  indent?: boolean;
  pillId: string;
}) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${
        indent ? "pl-9 pr-3" : "px-3"
      } ${active ? "text-white" : "text-slate-400 hover:text-white"}`}
    >
      {active ? (
        <motion.span
          layoutId={pillId}
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-600/30"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      ) : (
        <span className="absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-white/5" />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={`relative h-[18px] w-[18px] shrink-0 transition ${
          active ? "text-white" : "text-slate-500 group-hover:text-brand-300"
        }`}
      >
        {item.icon}
      </svg>
      <span className="relative whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

function Brand({ brandLabel, subLabel }: { brandLabel: string; subLabel: string }) {
  return (
    <div className="leading-tight">
      <span className="font-display block text-2xl font-semibold text-white">
        {brandLabel.toLowerCase()}
        <span className="text-gold-400">.</span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{subLabel}</span>
    </div>
  );
}

export function PanelSidebar({
  homeHref,
  brandLabel,
  subLabel,
  navItems,
  personName,
  personRole,
  logoutButton,
  defaultExpanded = false,
}: {
  homeHref: string;
  brandLabel: string;
  subLabel: string;
  navItems: PanelNavEntry[];
  personName: string;
  personRole: string;
  logoutButton: ReactNode;
  /** Start with every group open instead of only the one holding the active page. */
  defaultExpanded?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const uid = useId();

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Groups containing the active route start expanded; collapsed groups stay
  // collapsed across navigation so the sidebar doesn't jump around.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const collapsed = new Set<string>();
    for (const entry of navItems) {
      if (!defaultExpanded && isGroup(entry) && !groupHasActiveItem(pathname, entry, homeHref)) {
        collapsed.add(entry.label);
      }
    }
    return collapsed;
  });

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-brand-950 px-4 py-3 md:hidden">
        <Link href={homeHref} className="block">
          <Brand brandLabel={brandLabel} subLabel={subLabel} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-brand-950 shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Brand brandLabel={brandLabel} subLabel={subLabel} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavContent
                key="mobile-nav"
                pillId={`${uid}-m`}
                navItems={navItems}
                pathname={pathname}
                homeHref={homeHref}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
              />
              <PersonBlock key="mobile-person" personName={personName} personRole={personRole} logoutButton={logoutButton} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:bg-brand-950">
        <div className="relative flex h-full flex-col overflow-hidden">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative border-b border-white/5 px-6 py-6">
            <Link href={homeHref}>
              <Brand brandLabel={brandLabel} subLabel={subLabel} />
            </Link>
          </div>
          <NavContent
            key="desktop-nav"
            pillId={`${uid}-d`}
            navItems={navItems}
            pathname={pathname}
            homeHref={homeHref}
            collapsedGroups={collapsedGroups}
            toggleGroup={toggleGroup}
          />
          <PersonBlock key="desktop-person" personName={personName} personRole={personRole} logoutButton={logoutButton} />
        </div>
      </aside>
    </>
  );
}

function NavContent({
  navItems,
  pathname,
  homeHref,
  collapsedGroups,
  toggleGroup,
  pillId,
}: {
  navItems: PanelNavEntry[];
  pathname: string;
  homeHref: string;
  collapsedGroups: Set<string>;
  toggleGroup: (label: string) => void;
  pillId: string;
}) {
  return (
    <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 py-4 [scrollbar-color:#1e2a52_transparent] [scrollbar-width:thin]">
      {navItems.map((entry) => {
        if (!isGroup(entry)) {
          return (
            <NavLink
              key={entry.href}
              item={entry}
              pillId={pillId}
              active={isActive(pathname, entry.href, homeHref)}
            />
          );
        }

        const expanded = !collapsedGroups.has(entry.label);
        return (
          <div key={entry.label} className="pt-3 first:pt-0">
            <button
              type="button"
              onClick={() => toggleGroup(entry.label)}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300"
            >
              <span>{entry.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-0.5 overflow-hidden pt-0.5"
                >
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      pillId={pillId}
                      active={isActive(pathname, item.href, homeHref)}
                      indent
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

function PersonBlock({
  personName,
  personRole,
  logoutButton,
}: {
  personName: string;
  personRole: string;
  logoutButton?: ReactNode;
}) {
  return (
    <div className="relative border-t border-white/5 p-3">
      <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 text-sm font-bold text-ink">
            {personName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-white">{personName}</p>
            <p className="text-[11px] text-slate-400">{personRole}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs [&_button]:!text-rose-400 [&_button:hover]:!text-rose-300">
          <Link href="/" className="inline-flex items-center gap-1 font-semibold text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> View site
          </Link>
          {logoutButton}
        </div>
      </div>
    </div>
  );
}
