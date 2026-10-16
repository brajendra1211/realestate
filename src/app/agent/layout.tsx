import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ShopScanAlertListener } from "@/components/agent/ShopScanAlertListener";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agentProfile = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return (
    <div className="flex flex-col bg-slate-50 md:min-h-screen md:flex-row">
      {agentProfile && <ShopScanAlertListener agentProfileId={agentProfile.id} />}
      <AgentSidebar
        agentName={session.user.name ?? "Channel Partner"}
        logoutButton={
          <LogoutButton key="agent-logout" className="text-xs font-medium text-slate-500 hover:text-slate-800" />
        }
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
