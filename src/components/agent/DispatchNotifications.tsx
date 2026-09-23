"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socketClient";
import { acceptDispatchAction } from "@/app/dispatch/actions";

type IncomingDispatch = {
  dispatchRequestId: string;
  distanceKm: number;
  batch: number;
};

// Agent dashboard's live "incoming leads" widget — §3.5's radar/cascade from
// the agent side. `initial` seeds it from a Server Component read
// (getActiveDispatchesForAgent) so a page refresh doesn't lose in-flight
// leads; Socket.io covers everything that arrives after mount.
export function DispatchNotifications({
  agentProfileId,
  initial,
}: {
  agentProfileId: string;
  initial: IncomingDispatch[];
}) {
  const [leads, setLeads] = useState<IncomingDispatch[]>(initial);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join", { agentProfileId });

    function onNew(payload: IncomingDispatch) {
      setLeads((prev) =>
        prev.some((l) => l.dispatchRequestId === payload.dispatchRequestId) ? prev : [payload, ...prev]
      );
    }
    function onCancelled(payload: { dispatchRequestId: string }) {
      setLeads((prev) => prev.filter((l) => l.dispatchRequestId !== payload.dispatchRequestId));
    }

    socket.on("dispatch:new", onNew);
    socket.on("dispatch:cancelled", onCancelled);

    return () => {
      socket.off("dispatch:new", onNew);
      socket.off("dispatch:cancelled", onCancelled);
    };
  }, [agentProfileId]);

  if (leads.length === 0) {
    return <p className="text-sm text-slate-400">No incoming leads right now.</p>;
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div
          key={lead.dispatchRequestId}
          className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-blue-900">New customer nearby</p>
            <p className="text-xs text-blue-700">{lead.distanceKm} km away</p>
          </div>
          <form action={acceptDispatchAction}>
            <input type="hidden" name="dispatchRequestId" value={lead.dispatchRequestId} />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Accept
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
