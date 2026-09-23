import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getDispatchWithBuyerContact, DispatchServiceError } from "@/lib/dispatch";
import { scheduleAppointmentAction } from "@/app/agent/appointments/actions";

async function loadDispatch(id: string, agentId: string) {
  try {
    return await getDispatchWithBuyerContact(id, agentId);
  } catch (error) {
    if (error instanceof DispatchServiceError) return null;
    throw error;
  }
}

export default async function AgentDispatchLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const dispatch = await loadDispatch(id, agent.id);
  if (!dispatch) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Lead accepted</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Customer</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{dispatch.buyer.name}</p>
        {dispatch.buyer.phone && (
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Phone:</span> {dispatch.buyer.phone}
          </p>
        )}
        {dispatch.buyer.email && (
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-medium">Email:</span> {dispatch.buyer.email}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Schedule a site visit</h2>
        <p className="mt-1 text-xs text-slate-500">
          Both of you get a reminder — §3.7. If they don&apos;t show, you&apos;ll be able to
          escalate to a fresh nearby-agent broadcast.
        </p>
        <form action={scheduleAppointmentAction} className="mt-3 space-y-3">
          <input type="hidden" name="buyerId" value={dispatch.buyerId} />
          <div>
            <label className="text-xs font-medium text-slate-500">Master Property ID (optional)</label>
            <input
              type="text"
              name="masterId"
              placeholder="PROP-DEL-2026-8891"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Date & time</label>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Schedule visit
          </button>
        </form>
      </div>

      <Link href="/agent/dashboard" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
