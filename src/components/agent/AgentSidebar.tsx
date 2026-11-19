import type { ReactNode } from "react";
import { PanelSidebar, type PanelNavItem, type PanelNavEntry } from "@/components/PanelSidebar";

const ITEMS: PanelNavItem[] = [
  {
    href: "/agent/dashboard",
    label: "Overview",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h0a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10"
      />
    ),
  },
  {
    href: "/agent/payments",
    label: "Earnings & Payments",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
  },
  {
    href: "/agent/commissions",
    label: "Commissions",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
      />
    ),
  },
  {
    href: "/agent/profile",
    label: "My Profile & KYC",
    icon: (
      <>
        <circle cx="12" cy="7" r="4" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
        />
      </>
    ),
  },
  {
    href: "/agent/owner-requests",
    label: "Owner Requests",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
      />
    ),
  },
  {
    href: "/support",
    label: "Support & disputes",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
  {
    href: "/agent/buyer-leads",
    label: "Buyer Leads",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    href: "/agent/listings",
    label: "My Listings",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M4 21h16"
      />
    ),
  },
  {
    href: "/agent/investors",
    label: "Referral Partners",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8a3 3 0 110 6M21 20c0-2.8-2-5.1-4.7-5.8"
        />
      </>
    ),
  },
  {
    href: "/agent/investors/new",
    label: "Register Referral Partner",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14M5 12h14" />
    ),
  },
  {
    href: "/agent/appointments",
    label: "Scheduled Visits",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth={1.75} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
  },
  {
    href: "/agent/visits",
    label: "Site Visits",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" strokeWidth={1.75} />
      </>
    ),
  },
  {
    href: "/agent/digest",
    label: "Daily Digest",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h10" />
    ),
  },
  {
    href: "/agent/gold-feed",
    label: "Direct Customer Listings",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
    ),
  },
  {
    href: "/agent/documents",
    label: "Documents",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5"
      />
    ),
  },
  {
    href: "/agent/brochures",
    label: "Brochure Maker",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6" />
    ),
  },
  {
    href: "/agent/broadcast",
    label: "B2B Broadcast",
    icon: (
      <>
        <circle cx="12" cy="12" r="2" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5 5a9.5 9.5 0 000 14M19 5a9.5 9.5 0 010 14"
        />
      </>
    ),
  },
];

const byHref = Object.fromEntries(ITEMS.map((i) => [i.href, i])) as Record<string, PanelNavItem>;
const pick = (...hrefs: string[]) => hrefs.map((h) => byHref[h]);

// Grouped so a partner can find things by task instead of scanning 13 flat links.
const NAV_ITEMS: PanelNavEntry[] = [
  byHref["/agent/dashboard"],
  { label: "Money", items: pick("/agent/payments", "/agent/commissions") },
  {
    label: "Listings & leads",
    items: pick("/agent/owner-requests", "/agent/buyer-leads", "/agent/listings", "/agent/gold-feed", "/agent/appointments", "/agent/visits", "/agent/broadcast", "/agent/digest", "/agent/brochures"),
  },
  { label: "My network", items: pick("/agent/investors", "/agent/investors/new") },
  { label: "Account", items: pick("/agent/profile", "/agent/documents", "/support") },
];

export function AgentSidebar({ agentName, logoutButton }: { agentName: string; logoutButton: ReactNode }) {
  return (
    <PanelSidebar
      homeHref="/agent/dashboard"
      brandLabel="Pronesto"
      subLabel="Channel Partner Portal"
      navItems={NAV_ITEMS}
      defaultExpanded
      personName={agentName}
      personRole="Channel Partner"
      logoutButton={logoutButton}
    />
  );
}
