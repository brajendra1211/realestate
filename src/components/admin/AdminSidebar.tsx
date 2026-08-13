import type { ReactNode } from "react";
import { PanelSidebar, type PanelNavItem } from "@/components/PanelSidebar";

const NAV_ITEMS: PanelNavItem[] = [
  {
    href: "/admin",
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
    href: "/admin/properties",
    label: "Properties",
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
    href: "/admin/users",
    label: "Dealers & Owners",
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
    href: "/admin/subadmins",
    label: "Sub-admins",
    icon: (
      <>
        <circle cx="8" cy="8" r="3" strokeWidth={1.75} />
        <circle cx="17" cy="6" r="2.5" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M2.5 20c0-3.6 2.5-6.5 5.5-6.5s5.5 2.9 5.5 6.5M14.5 15a5 5 0 014.9 4.2"
        />
      </>
    ),
  },
  {
    href: "/admin/developers",
    label: "Developers",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 21V7l6-3 6 3v14M15 21V11l6-2v12M9 21v-4M3 21h18"
      />
    ),
  },
  {
    href: "/admin/locations",
    label: "Locations",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z"
        />
        <circle cx="12" cy="10" r="2.5" strokeWidth={1.75} />
      </>
    ),
  },
  {
    href: "/admin/enquiries",
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
    href: "/admin/plans",
    label: "Plans",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4"
      />
    ),
  },
  {
    href: "/admin/amenities",
    label: "Amenities",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
    ),
  },
  {
    href: "/admin/sitemap",
    label: "Sitemap",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z" />
      </>
    ),
  },
  {
    href: "/admin/settings",
    label: "Website Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        />
      </>
    ),
  },
];

export function AdminSidebar({
  adminName,
  logoutButton,
}: {
  adminName: string;
  logoutButton: ReactNode;
}) {
  return (
    <PanelSidebar
      homeHref="/admin"
      brandLabel="BayaEstate"
      subLabel="Admin Panel"
      navItems={NAV_ITEMS}
      personName={adminName}
      personRole="Administrator"
      logoutButton={logoutButton}
    />
  );
}
