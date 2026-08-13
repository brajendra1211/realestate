import { auth } from "@/auth";
import { MobileBottomNavShell, type BottomNavItem } from "@/components/MobileBottomNavShell";

export async function MobileBottomNav() {
  const session = await auth();

  let middle: BottomNavItem = { href: "/register", label: "Post", icon: "plus" };
  let account: BottomNavItem = { href: "/login", label: "Login", icon: "user" };

  if (
    session?.user.role === "OWNER" ||
    session?.user.role === "DEALER" ||
    session?.user.role === "SUBADMIN"
  ) {
    middle = { href: "/dashboard/properties/new", label: "Add", icon: "plus" };
    account = { href: "/dashboard/profile", label: "Account", icon: "user" };
  } else if (session?.user.role === "ADMIN") {
    middle = { href: "/admin", label: "Admin", icon: "grid" };
    account = { href: "/admin/users", label: "Users", icon: "user" };
  } else if (session?.user.role === "BUYER") {
    middle = { href: "/buyer/dashboard#saved", label: "Saved", icon: "heart" };
    account = { href: "/buyer/dashboard#profile", label: "Account", icon: "user" };
  }

  const items: BottomNavItem[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/properties", label: "Explore", icon: "search" },
    middle,
    account,
  ];

  return <MobileBottomNavShell items={items} />;
}
