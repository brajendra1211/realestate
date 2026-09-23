import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getChatThread } from "@/lib/broadcast";
import { prisma } from "@/lib/prisma";
import { ChatThread } from "@/components/agent/ChatThread";
import { DealLifecycleCard } from "@/components/agent/DealLifecycleCard";

export default async function BroadcastChatPage({
  params,
}: {
  params: Promise<{ id: string; agentId: string }>;
}) {
  const { id: broadcastId, agentId: otherAgentId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const otherAgent = await prisma.agentProfile.findUnique({
    where: { id: otherAgentId },
    select: { agentCode: true, user: { select: { name: true } } },
  });
  if (!otherAgent) notFound();

  const [messages, deal] = await Promise.all([
    getChatThread(broadcastId, agent.id, otherAgentId),
    prisma.deal.findFirst({
      where: {
        broadcastId,
        OR: [
          { buyerAgentId: agent.id, sellerAgentId: otherAgentId },
          { buyerAgentId: otherAgentId, sellerAgentId: agent.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <a href="/agent/broadcast" className="text-sm text-blue-600 hover:underline">
        ← Back to broadcasts
      </a>
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        Chat with {otherAgent.agentCode} ({otherAgent.user.name})
      </h1>

      <div className="mt-4">
        <DealLifecycleCard
          deal={deal}
          broadcastId={broadcastId}
          myAgentId={agent.id}
          otherAgentId={otherAgentId}
        />
      </div>

      <div className="mt-2">
        <ChatThread
          broadcastId={broadcastId}
          myAgentId={agent.id}
          otherAgentId={otherAgentId}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
