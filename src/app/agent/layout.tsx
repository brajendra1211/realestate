import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  return (
    <div className="flex flex-col bg-slate-50 md:min-h-screen md:flex-row">
      <AgentSidebar
        agentName={session.user.name ?? "Agent"}
        logoutButton={
          <LogoutButton className="text-xs font-medium text-slate-500 hover:text-slate-800" />
        }
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
