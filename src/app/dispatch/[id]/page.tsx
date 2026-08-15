import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDispatchStatus } from "@/lib/dispatch";
import { DispatchRadar } from "@/components/DispatchRadar";

export default async function DispatchStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session) redirect(`/buyer/login?next=${encodeURIComponent(`/dispatch/${id}`)}`);

  const dispatch = await getDispatchStatus(id);
  if (!dispatch || dispatch.buyerId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-center text-2xl font-bold text-slate-900">Finding you an agent</h1>
      <div className="mt-8">
        <DispatchRadar
          dispatchRequestId={dispatch.id}
          initialStatus={dispatch.status}
          initialRadiusKm={dispatch.currentRadiusKm}
          initialMatched={
            dispatch.status === "MATCHED" && dispatch.acceptedAgent
              ? {
                  agentCode: dispatch.acceptedAgent.agentCode ?? "",
                  shopName: dispatch.acceptedAgent.shopName,
                  shopDistance: 0,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
