import type { ReactNode } from "react";
import { PanelSidebar, type PanelNavItem } from "@/components/PanelSidebar";

const NAV_ITEMS: PanelNavItem[] = [
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
    label: "Investors",
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
    label: "Register Investor",
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

export function AgentSidebar({ agentName, logoutButton }: { agentName: string; logoutButton: ReactNode }) {
  return (
    <PanelSidebar
      homeHref="/agent/dashboard"
      brandLabel="BayaEstate"
      subLabel="Agent Portal"
      navItems={NAV_ITEMS}
      personName={agentName}
      personRole="Agent"
      logoutButton={logoutButton}
    />
  );
}
