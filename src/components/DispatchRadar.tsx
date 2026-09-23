"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";
import { cancelDispatchAction } from "@/app/dispatch/actions";

type Status = "SEARCHING" | "MATCHED" | "EXPIRED" | "CANCELLED";

type MatchedInfo = { agentCode: string; shopName: string | null; shopDistance: number };

export function DispatchRadar({
  dispatchRequestId,
  initialStatus,
  initialRadiusKm,
  initialMatched,
}: {
  dispatchRequestId: string;
  initialStatus: Status;
  initialRadiusKm: number;
  initialMatched: MatchedInfo | null;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [agentsNotified, setAgentsNotified] = useState(0);
  const [matched, setMatched] = useState<MatchedInfo | null>(initialMatched);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join", { dispatchRequestId });

    function onBatch(payload: { radiusKm: number; agentsNotified: number }) {
      setRadiusKm(payload.radiusKm);
      setAgentsNotified(payload.agentsNotified);
    }
    function onMatched(payload: MatchedInfo) {
      setStatus("MATCHED");
      setMatched(payload);
    }
    function onExpired() {
      setStatus("EXPIRED");
    }
    function onCancelled() {
      setStatus("CANCELLED");
    }

    socket.on("dispatch:batch", onBatch);
    socket.on("dispatch:matched", onMatched);
    socket.on("dispatch:expired", onExpired);
    socket.on("dispatch:cancelled", onCancelled);

    return () => {
      socket.off("dispatch:batch", onBatch);
      socket.off("dispatch:matched", onMatched);
      socket.off("dispatch:expired", onExpired);
      socket.off("dispatch:cancelled", onCancelled);
    };
  }, [dispatchRequestId]);

  if (status === "MATCHED" && matched) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">
          Agent {matched.agentCode} accepted!
        </p>
        {matched.shopName && <p className="mt-1 text-sm text-green-700">{matched.shopName}</p>}
        <p className="mt-1 text-sm text-green-700">Shop distance: {matched.shopDistance} km</p>
        <Link
          href={`/rate/${matched.agentCode}`}
          className="mt-3 inline-block text-sm font-medium text-green-800 hover:underline"
        >
          Rate this agent after your visit →
        </Link>
      </div>
    );
  }

  if (status === "EXPIRED") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold text-slate-700">No agents were available.</p>
        <Link href="/dispatch/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Try again
        </Link>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        Request cancelled.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
      <div className="mx-auto h-12 w-12 animate-ping rounded-full bg-blue-300" />
      <p className="mt-4 font-semibold text-blue-800">
        Finding nearby agents in {radiusKm} km…
      </p>
      {agentsNotified > 0 && (
        <p className="mt-1 text-sm text-blue-700">{agentsNotified} agent(s) notified</p>
      )}
      <form action={cancelDispatchAction} className="mt-4">
        <input type="hidden" name="dispatchRequestId" value={dispatchRequestId} />
        <button type="submit" className="text-sm font-medium text-slate-500 hover:underline">
          Cancel request
        </button>
      </form>
    </div>
  );
}
