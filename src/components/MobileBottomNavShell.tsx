"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "search" | "plus" | "heart" | "grid" | "user";

const ICONS: Record<IconName, React.ReactNode> = {
  home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M4 11.5L12 4l8 7.5M6 10v9h12v-9" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" strokeWidth={1.9} />
      <path strokeLinecap="round" strokeWidth={1.9} d="M20 20l-4.3-4.3" />
    </>
  ),
  plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 5v14M5 12h14" />,
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      d="M12 20s-7-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 5c-2.5 4.5-9.5 9-9.5 9z"
    />
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" strokeWidth={1.9} />
      <rect x="13" y="4" width="7" height="7" rx="1.5" strokeWidth={1.9} />
      <rect x="4" y="13" width="7" height="7" rx="1.5" strokeWidth={1.9} />
      <rect x="13" y="13" width="7" height="7" rx="1.5" strokeWidth={1.9} />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" strokeWidth={1.9} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" />
    </>
  ),
};

export type BottomNavItem = { href: string; label: string; icon: IconName };

const HIDDEN_PREFIXES = ["/admin", "/dashboard"];

export function MobileBottomNavShell({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              active ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              {ICONS[item.icon]}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
