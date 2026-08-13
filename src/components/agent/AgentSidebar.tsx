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
