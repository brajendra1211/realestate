import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ShopScanAlertListener } from "@/components/agent/ShopScanAlertListener";
import { OwnerRequestBuzzer } from "@/components/agent/OwnerRequestBuzzer";
import "../admin/neon.css";

// Same light + neon look as the admin console.
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agentProfile = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, agentCode: true, primeStatus: true },
  });

  return (
    <div className="admin-neon flex min-h-screen flex-col font-sans md:flex-row">
      {agentProfile && <ShopScanAlertListener agentProfileId={agentProfile.id} />}
      {agentProfile && <OwnerRequestBuzzer />}
      <AgentSidebar
        agentName={session.user.name ?? "Channel Partner"}
        logoutButton={
          <LogoutButton key="agent-logout" className="cursor-pointer text-[11px] font-bold text-fuchsia-500 transition hover:text-fuchsia-400" />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-sky-400/25 px-4 sm:px-8 md:flex">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Channel Partner</span>
            <span className="text-sky-400/60">/</span>
            <span className="text-sm font-bold text-ink">Portal</span>
            {agentProfile?.primeStatus && (
              <span className="neon-chip is-green ml-2 hidden sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                Prime active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {agentProfile?.agentCode && <span className="neon-chip is-cyan">Code {agentProfile.agentCode}</span>}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 text-sm font-bold text-[#04050d] shadow-[0_0_14px_rgba(255,225,77,0.45)]">
              {(session.user.name ?? "A").charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-ink">{session.user.name}</span>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
