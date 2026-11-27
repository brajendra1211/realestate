import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { claimWatchForAgent, listOpenWatchesForAgent } from "@/lib/watchlist";
import { sharedCartsForAgent, type CartLine } from "@/lib/cart";
import { getOfficeVisitSummary } from "@/lib/officeVisit";

async function haveProperty(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  await claimWatchForAgent(String(formData.get("watchId") ?? ""), agent.id, null).catch(() => {});
  revalidatePath("/agent/requirements");
}

export default async function AgentRequirementsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const [reqs, carts, visit] = await Promise.all([
    listOpenWatchesForAgent(),
    sharedCartsForAgent(agent.id),
    getOfficeVisitSummary(agent.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer requirements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Open requirements with no match yet. If you have a matching property, tap &quot;I have a property&quot; and the customer gets your details.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-soft">
        <span className="font-semibold text-ink">Last office visit: </span>
        {visit.last ? visit.last.visitedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "No visit recorded yet"}
      </div>

      <section className="space-y-3">
        {reqs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No open requirements right now.
          </p>
        ) : (
          reqs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">
                  {r.purpose} · {r.bhk ? `${r.bhk} BHK` : "Any size"}
                </p>
                <p className="text-sm text-slate-500">
                  {r.societyName ?? "Any society"} · within {r.radiusKm} km{r.budgetMax ? ` · up to ₹${r.budgetMax.toLocaleString("en-IN")}` : ""}
                </p>
              </div>
              <form action={haveProperty}>
                <input type="hidden" name="watchId" value={r.id} />
                <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  I have a property
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Carts sent to you</h2>
        {carts.length === 0 ? (
          <p className="text-sm text-slate-500">No customer has sent you a cart yet.</p>
        ) : (
          carts.map((c) => {
            const items = JSON.parse(c.itemsJson) as CartLine[];
            return (
              <details key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <summary className="cursor-pointer font-semibold text-ink">
                  {items.length} properties · {c.createdAt.toLocaleDateString("en-IN")}
                </summary>
                {c.note && <p className="mt-2 text-sm text-slate-600">{c.note}</p>}
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {items.map((it) => (
                    <li key={it.id} className="py-2">
                      {it.title} · {it.city ?? ""} · ₹{it.price.toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })
        )}
      </section>
    </div>
  );
}
