import type { ReactNode } from "react";
import { PanelSidebar, type PanelNavItem } from "@/components/PanelSidebar";

export const DASHBOARD_NAV_ITEMS: PanelNavItem[] = [
  {
    href: "/dashboard",
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
    href: "/dashboard/properties/new",
    label: "Add Property",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14M5 12h14" />
    ),
  },
  {
    href: "/dashboard/enquiries",
    label: "Enquiries",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4 6h16v12H4V6zm0 0l8 7 8-7"
      />
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Payment History",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={1.75} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18" />
      </>
    ),
  },
  {
    href: "/dashboard/profile",
    label: "My Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" strokeWidth={1.75} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" />
      </>
    ),
  },
];

export function DashboardSidebar({
  userName,
  roleLabel,
  logoutButton,
  navItems = DASHBOARD_NAV_ITEMS,
}: {
  userName: string;
  roleLabel: string;
  logoutButton: ReactNode;
  navItems?: PanelNavItem[];
}) {
  return (
    <PanelSidebar
      homeHref="/dashboard"
      brandLabel="BayaEstate"
      subLabel={roleLabel}
      navItems={navItems}
      personName={userName}
      personRole={roleLabel}
      logoutButton={logoutButton}
    />
  );
}
