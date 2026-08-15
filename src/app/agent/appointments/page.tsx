import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getAppointmentsForAgent } from "@/lib/appointment";
import { markCompletedAction, cancelAppointmentAction } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  NO_SHOW: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default async function AgentAppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved } = await searchParams;
  const appointments = await getAppointmentsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Scheduled Visits</h1>
      <p className="mt-1 text-sm text-slate-500">
        Book new visits from an accepted lead&apos;s page. Full audit trail: visit date, inquiry
        date, follow-up due date (§3.7).
      </p>

      {saved && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {appointments.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No visits scheduled yet.</p>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {appt.buyer.name} {appt.masterProperty && `· ${appt.masterProperty.masterId}`}
                </p>
                <p className="text-xs text-slate-500">
                  {appt.scheduledAt.toLocaleString("en-IN")} · {appt.bookingCode}
                  {appt.followUpDueAt && ` · follow-up by ${appt.followUpDueAt.toLocaleDateString("en-IN")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[appt.status]}`}>
                  {appt.status}
                </span>
                {appt.status === "SCHEDULED" && (
                  <>
                    <form action={markCompletedAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <button type="submit" className="text-xs font-medium text-green-600 hover:underline">
                        Mark done
                      </button>
                    </form>
                    <form action={cancelAppointmentAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Cancel
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
