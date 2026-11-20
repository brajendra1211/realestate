import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/LogoutButton";
import "./neon.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="admin-neon flex min-h-screen flex-col font-sans md:flex-row">
      <AdminSidebar
        adminName={session.user.name ?? "Admin"}
        logoutButton={
          <LogoutButton
            key="admin-logout"
            className="cursor-pointer text-[11px] font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
          />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sky-400/25 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Admin</span>
            <span className="text-sky-400/60">/</span>
            <span className="text-sm font-bold text-ink">Control center</span>
            <span className="neon-chip is-green ml-2 hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              Live system
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-full border border-sky-400/40 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-sky-500 hover:text-sky-700 sm:inline-flex"
            >
              Public site <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <Link href="/admin/properties/new" className="neon-btn">
              <Plus className="h-3.5 w-3.5" /> Add property
            </Link>
            <div className="h-5 w-px bg-cyan-400/20" />
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 text-sm font-bold text-[#04050d] shadow-[0_0_14px_rgba(255,225,77,0.45)]">
                {session.user.name ? session.user.name.charAt(0).toUpperCase() : "A"}
              </span>
              <span className="hidden text-sm font-semibold text-ink sm:inline">{session.user.name}</span>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
