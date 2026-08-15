import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { LogoutButton } from "@/components/LogoutButton";
import { canSwitchAgent } from "@/lib/agentSwitch";
import { getAppointmentsForBuyer } from "@/lib/appointment";
import { updateBuyerProfile, toggleSavedProperty, switchAgentAction, markNoShowAction } from "../actions";

type SearchParams = Promise<{
  saved?: string;
  error?: string;
  switchSaved?: string;
  switchError?: string;
  appointmentError?: string;
}>;

const SWITCH_ERROR_MESSAGES: Record<string, string> = {
  reasonRequired: "A reason is required before you can switch agents.",
  dailyLimitReached: "You've reached the daily limit of 3 agent switches.",
  cooldown: "Please wait before switching again — there's a cooldown between switches.",
  noPhone: "Add a phone number to your profile before switching agents.",
};

const APPOINTMENT_ERROR_MESSAGES: Record<string, string> = {
  notScheduled: "This visit isn't awaiting a no-show report.",
  notYetDue: "The scheduled time hasn't passed yet.",
  noLocation: "This visit has no property location on file, so it can't be escalated.",
};

export default async function BuyerDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/buyer/login");
  if (session.user.role !== "BUYER") redirect("/dashboard");

  const { saved, error, switchSaved, switchError, appointmentError } = await searchParams;

  const [user, savedProperties, enquiries, currentDispatch, switchGate, appointments] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.savedProperty.findMany({
      where: { userId: session.user.id },
      include: { property: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enquiry.findMany({
      where: { buyerId: session.user.id },
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispatchRequest.findFirst({
      where: { buyerId: session.user.id, status: "MATCHED" },
      include: { acceptedAgent: { select: { id: true, agentCode: true, shopName: true } } },
      orderBy: { acceptedAt: "desc" },
    }),
    (async () => {
      const buyer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
      return buyer?.phone ? canSwitchAgent(buyer.phone) : null;
    })(),
    getAppointmentsForBuyer(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My account</h1>
          <p className="mt-1 text-sm text-slate-500">Saved properties and enquiries in one place.</p>
        </div>
        <LogoutButton className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" />
      </div>

      <div id="profile" className="mt-8 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">My profile</h2>
        {saved === "1" && (
          <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
        )}
        {error === "email" && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            That email is already used by another account.
          </p>
        )}
        <form action={updateBuyerProfile} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={user.name}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Phone</label>
            <input
              type="tel"
              name="phone"
              defaultValue={user.phone ?? undefined}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={user.email ?? undefined}
              suppressHydrationWarning
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Save profile
            </button>
          </div>
        </form>
      </div>

      {currentDispatch?.acceptedAgent && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Your current agent</h2>
          <p className="mt-1 text-sm text-slate-600">
            {currentDispatch.acceptedAgent.agentCode}
            {currentDispatch.acceptedAgent.shopName && ` — ${currentDispatch.acceptedAgent.shopName}`}
          </p>

          {switchSaved === "1" && (
            <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Switch request submitted.
            </p>
          )}
          {switchError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {SWITCH_ERROR_MESSAGES[switchError] ?? "Something went wrong. Try again."}
            </p>
          )}

          {switchGate && !switchGate.allowed ? (
            <p className="mt-3 text-xs text-slate-400">
              {switchGate.reason === "dailyLimitReached"
                ? "You've used all 3 switches allowed today."
                : `You can switch again after ${switchGate.nextAllowedAt?.toLocaleTimeString("en-IN")}.`}
            </p>
          ) : (
            <form action={switchAgentAction} className="mt-3 space-y-3">
              <input type="hidden" name="fromAgentId" value={currentDispatch.acceptedAgent.id} />
              <input type="hidden" name="latitude" value={currentDispatch.latitude} />
              <input type="hidden" name="longitude" value={currentDispatch.longitude} />
              <div>
                <label className="text-xs font-medium text-slate-500">Reason (required)</label>
                <select
                  name="reason"
                  required
                  defaultValue=""
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  <option value="Unresponsive">Agent unresponsive</option>
                  <option value="No-show">Agent didn&apos;t show up</option>
                  <option value="Unprofessional">Unprofessional behavior</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" name="isComplaint" />
                File this as a formal complaint (counts toward the agent&apos;s 3-strike record)
              </label>
              <button
                type="submit"
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Switch agent
              </button>
            </form>
          )}
        </div>
      )}

      {appointments.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Scheduled visits</h2>
          {appointmentError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {APPOINTMENT_ERROR_MESSAGES[appointmentError] ?? "Something went wrong. Try again."}
            </p>
          )}
          <div className="mt-3 space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700">
                    {appt.agent.agentCode}
                    {appt.masterProperty && ` · ${appt.masterProperty.masterId}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {appt.scheduledAt.toLocaleString("en-IN")} · {appt.status}
                  </p>
                </div>
                {appt.status === "SCHEDULED" && appt.isDue && (
                  <form action={markNoShowAction}>
                    <input type="hidden" name="appointmentId" value={appt.id} />
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Agent didn&apos;t show
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="saved" className="mt-10 scroll-mt-20">
        <h2 className="text-lg font-semibold text-slate-900">
          Saved properties ({savedProperties.length})
        </h2>
        {savedProperties.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Nothing saved yet —{" "}
            <Link href="/properties" className="text-blue-600 hover:underline">
              browse properties
            </Link>{" "}
            and tap the heart icon to save one.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedProperties.map(({ property }) => (
              <div key={property.id} className="relative">
                <PropertyCard property={property} />
                <form action={toggleSavedProperty} className="absolute right-3 top-3">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <input type="hidden" name="redirectTo" value="/buyer/dashboard" />
                  <button
                    type="submit"
                    aria-label="Remove from saved"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-white"
                  >
                    ♥
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">My enquiries ({enquiries.length})</h2>
        {enquiries.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No enquiries sent yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {enquiries.map((enquiry) => (
              <div key={enquiry.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                {enquiry.property ? (
                  <Link
                    href={`/properties/${enquiry.property.slug}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {enquiry.property.title}
                  </Link>
                ) : (
                  <p className="font-medium text-slate-800">General enquiry</p>
                )}
                {enquiry.message && <p className="mt-1 text-slate-500">{enquiry.message}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  {enquiry.createdAt.toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
