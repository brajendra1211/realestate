import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageBanner } from "@/components/ui/PageBanner";
import { createTicketAction } from "./actions";

export const metadata = { title: "Support & disputes" };

const CATEGORY_LABEL: Record<string, string> = {
  COMMISSION_CONFLICT: "Commission conflict (partner to partner)",
  CUSTOMER_COMPLAINT: "Customer complaint",
  WEBSITE_FEEDBACK: "Website feedback / problem",
};
const STATUS_LABEL: Record<string, string> = { OPEN: "Open", IN_REVIEW: "Being audited", RESOLVED: "Resolved" };

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login?next=/support");
  const sp = await searchParams;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const showCommission = session.user.role === "AGENT" || session.user.role === "INVESTOR";

  return (
    <div className="bg-slate-50">
      <PageBanner
        art="home"
        eyebrow="Help desk"
        title="Support & disputes"
        subtitle="Commission conflicts and complaints are audited and resolved within 2 hours."
      />
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        {sp.sent && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Your request is registered. Our team will audit it and reply within 2 hours.
          </p>
        )}
        {sp.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Please fill every field.</p>}

        <form action={createTicketAction} className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">What is this about?</label>
            <select name="category" className={field} defaultValue={showCommission ? "COMMISSION_CONFLICT" : "CUSTOMER_COMPLAINT"}>
              {Object.entries(CATEGORY_LABEL)
                .filter(([k]) => showCommission || k !== "COMMISSION_CONFLICT")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject</label>
            <input name="subject" required maxLength={150} className={field} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</label>
            <textarea name="message" required rows={5} maxLength={4000} className={field} />
          </div>
          <button type="submit" className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700">
            Submit
          </button>
        </form>

        {tickets.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My requests</h2>
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{t.subject}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{STATUS_LABEL[t.status]}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {CATEGORY_LABEL[t.category]} · {t.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {t.resolution && <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{t.resolution}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
