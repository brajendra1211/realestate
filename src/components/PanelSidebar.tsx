"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

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
}: {
  item: PanelNavItem;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition ${
        indent ? "pl-9 pr-3" : "px-3"
      } ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
      >
        {item.icon}
      </svg>
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
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
}: {
  homeHref: string;
  brandLabel: string;
  subLabel: string;
  navItems: PanelNavEntry[];
  personName: string;
  personRole: string;
  logoutButton: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Groups containing the active route start expanded; collapsed groups stay
  // collapsed across navigation so the sidebar doesn't jump around.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const collapsed = new Set<string>();
    for (const entry of navItems) {
      if (isGroup(entry) && !groupHasActiveItem(pathname, entry, homeHref)) {
        collapsed.add(entry.label);
      }
    }
    return collapsed;
  });

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
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

  const navContent = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {navItems.map((entry) => {
        if (!isGroup(entry)) {
          return (
            <NavLink key={entry.href} item={entry} active={isActive(pathname, entry.href, homeHref)} />
          );
        }

        const expanded = !collapsedGroups.has(entry.label);
        return (
          <div key={entry.label} className="pt-2 first:pt-0">
            <button
              type="button"
              onClick={() => toggleGroup(entry.label)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-600"
            >
              <span>{entry.label}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {expanded && (
              <div className="space-y-0.5 pt-0.5">
                {entry.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item.href, homeHref)} indent />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const personBlock = (
    <div className="border-t border-slate-200 px-3 py-4">
      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {personName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{personName}</p>
          <p className="text-xs text-slate-400">{personRole}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-3">
        <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← View site
        </Link>
        {logoutButton}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href={homeHref} className="block">
          <p className="text-base font-bold leading-tight tracking-tight text-slate-900">{brandLabel}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{subLabel}</p>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-base font-bold tracking-tight text-slate-900">{brandLabel}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{subLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {navContent}
            {personBlock}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:border-r md:border-slate-200 md:bg-white">
        <div className="flex h-full flex-col">
          <div className="px-6 py-6">
            <Link href={homeHref} className="text-lg font-bold tracking-tight text-slate-900">
              {brandLabel}
            </Link>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{subLabel}</p>
          </div>
          {navContent}
          {personBlock}
        </div>
      </aside>
    </>
  );
}
