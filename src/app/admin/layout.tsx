import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex flex-col bg-brand-950 font-sans md:min-h-screen md:flex-row">
      <AdminSidebar
        adminName={session.user.name ?? "Admin"}
        logoutButton={
          <LogoutButton
            key="admin-logout"
            className="cursor-pointer text-[11px] font-bold text-rose-400 transition hover:text-rose-300"
          />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-ink">Control center</span>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live system
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-brand-600 hover:text-brand-700 sm:inline-flex"
            >
              Public site <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/properties/new"
              className="shine inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-600/25 transition hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Add property
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-sm font-bold text-ink">
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
