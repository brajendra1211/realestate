import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLeadUsage } from "@/lib/lead-quota";
import { revealLead } from "../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function DashboardEnquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { error } = await searchParams;
  const isLister = session.user.role === "OWNER" || session.user.role === "DEALER";

  const [enquiries, usage, leadViews] = await Promise.all([
    prisma.enquiry.findMany({
      where: { property: { ownerId: session.user.id } },
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    isLister ? getLeadUsage(session.user.id, session.user.role) : null,
    prisma.leadView.findMany({
      where: { userId: session.user.id },
      select: { enquiryId: true },
    }),
  ]);

  const revealedIds = new Set(leadViews.map((view) => view.enquiryId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enquiries</h1>
        <p className="mt-1 text-sm text-slate-500">
          Buyer contact details stay hidden until you view them — each view uses one lead from
          your plan.
        </p>
      </div>

      {usage && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              {usage.used} of {usage.limit === Infinity ? "unlimited" : usage.limit} leads viewed
            </p>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${usage.atLimit ? "bg-red-500" : "bg-blue-600"}`}
                style={{
                  width:
                    usage.limit === Infinity
                      ? "8%"
                      : `${Math.min((usage.used / Math.max(usage.limit, 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          {usage.atLimit && (
            <p className="mt-2 text-sm text-red-600">
              You&apos;ve used all your lead reveals for this plan.{" "}
              <Link href="/dashboard" className="font-medium underline underline-offset-2">
                Upgrade to view more
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {error === "limit" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          You&apos;ve reached your lead-reveal limit for this plan. Upgrade to view more contacts.
        </p>
      )}

      {enquiries.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No enquiries on your listings yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {enquiries.map((enquiry) => {
            const revealed = revealedIds.has(enquiry.id);
            return (
              <div key={enquiry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{enquiry.name}</p>
                    {enquiry.property ? (
                      <Link
                        href={`/properties/${enquiry.property.slug}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {enquiry.property.title}
                      </Link>
                    ) : (
                      <p className="text-sm text-slate-500">General enquiry</p>
                    )}
                    {enquiry.message && (
                      <p className="mt-1 text-sm text-slate-600">{enquiry.message}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {enquiry.createdAt.toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {revealed ? (
                      <div className="text-sm text-slate-700">
                        <p className="font-medium">{enquiry.phone}</p>
                        {enquiry.email && <p className="text-slate-500">{enquiry.email}</p>}
                      </div>
                    ) : (
                      <form action={revealLead}>
                        <input type="hidden" name="enquiryId" value={enquiry.id} />
                        <button
                          type="submit"
                          disabled={usage?.atLimit}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          View contact
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
