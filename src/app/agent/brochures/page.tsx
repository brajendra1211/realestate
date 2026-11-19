import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";
import { BROCHURE_PACK_CREDITS, BROCHURE_PACK_PRICE } from "@/lib/brochure";
import { BrochureRechargeButton } from "@/components/agent/BrochureRechargeButton";
import { generateBrochureAction } from "./actions";

type SearchParams = Promise<{ err?: string }>;

export default async function AgentBrochuresPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { err } = await searchParams;
  const [me, brochures, recharges] = await Promise.all([
    prisma.agentProfile.findUniqueOrThrow({ where: { id: agent.id }, select: { brochureCredits: true } }),
    prisma.brochure.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, sourceRef: true, createdAt: true },
    }),
    prisma.brochureRecharge.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const credits = me.brochureCredits;
  const dt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Property Brochure Maker</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kisi bhi property ka apne naam aur partner code ke saath brochure banaiye. ₹{BROCHURE_PACK_PRICE} mein{" "}
        {BROCHURE_PACK_CREDITS} brochure; credits khatam hone par dobara ₹{BROCHURE_PACK_PRICE} recharge.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Brochure credits left</p>
          <p className={`mt-1 text-4xl font-black ${credits > 0 ? "text-emerald-600" : "text-red-600"}`}>{credits}</p>
        </div>
        <BrochureRechargeButton price={BROCHURE_PACK_PRICE} credits={BROCHURE_PACK_CREDITS} />
      </div>

      <form action={generateBrochureAction} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="property" className="text-sm font-semibold text-slate-800">
          Property code ya listing link
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="property"
            name="property"
            required
            placeholder="e.g. MP-123456 ya https://…/listings/3bhk-gaur-city"
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={credits < 1}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Make brochure (1 credit)
          </button>
        </div>
        {credits < 1 && (
          <p className="mt-2 text-xs font-semibold text-amber-700">Credits khatam — pehle ₹{BROCHURE_PACK_PRICE} recharge kijiye.</p>
        )}
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>

      <h2 className="mt-8 text-lg font-bold text-slate-900">Meri brochures</h2>
      <p className="text-xs text-slate-500">Purani brochure dobara kholna free hai.</p>
      {brochures.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Abhi koi brochure nahi bani.</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {brochures.map((b) => (
            <Link key={b.id} href={`/agent/brochures/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{b.title}</p>
                <p className="text-xs text-slate-500">{b.sourceRef}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{dt(b.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}

      {recharges.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold text-slate-900">Recharge history</h2>
          <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
            {recharges.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <span>
                  +{r.credits} credits {r.source === "ADMIN" && <span className="text-xs text-slate-400">(admin)</span>}
                </span>
                <span className="text-xs text-slate-500">
                  ₹{r.amount} · {dt(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
