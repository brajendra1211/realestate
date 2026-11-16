import Link from "next/link";
import { redirect } from "next/navigation";
import { Phone, Store, UserSearch } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleInterestsForAgent, shopLink } from "@/lib/buyerInterest";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ShareShopButtons } from "./ShareShopButtons";

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function BuyerLeadsPage() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, agentCode: true, user: { select: { name: true } } },
  });
  if (!agent) redirect("/login");

  const [waiting, mine] = await Promise.all([
    visibleInterestsForAgent(agent.id),
    prisma.buyerInterestAcceptance.findMany({
      where: { agentId: agent.id },
      orderBy: { acceptedAt: "desc" },
      take: 50,
      include: { interest: true },
    }),
  ]);
  const buyers = await prisma.user.findMany({
    where: { id: { in: [...new Set(mine.map((m) => m.interest.buyerId))] } },
    select: { id: true, name: true, phone: true },
  });
  const buyerOf = (id: string) => buyers.find((b) => b.id === id);
  const myShop = agent.agentCode ? shopLink(agent.agentCode) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Buyer leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Buyers who paid to see a property. You are buzzed first for your own listings, and for buyers within 5 km who want a
          property like yours. Several partners can take the same buyer, so accept fast, call them, and send your listings link.
        </p>
      </div>

      {myShop && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <Store className="h-4 w-4" /> Your listings link
          </p>
          <p className="mt-1 break-all text-xs text-emerald-800">{myShop}</p>
          <p className="mt-2 text-xs text-emerald-800">
            A buyer who has paid can open this link and see the full details of <b>all</b> your listings.
          </p>
          <div className="mt-3">
            <ShareShopButtons link={myShop} agentName={agent.user.name} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <UserSearch className="h-4 w-4" /> Waiting for a partner ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No buyers waiting. When a buyer pays to unlock a property, you get a buzzer here.
          </p>
        ) : (
          waiting.map((w) => (
            <div key={w.id} className="rounded-2xl border-2 border-emerald-400 bg-white p-4 shadow-soft">
              <p className="font-bold text-ink">{w.primary ? `A buyer unlocked your listing: ${w.title}` : "A buyer near you wants a property"}</p>
              <p className="text-xs text-slate-500">{w.summary}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Use the buzzer on screen to accept.</p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My buyers ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No accepted buyers yet.</p>
        ) : (
          mine.map((a) => {
            const m = a.interest;
            const b = buyerOf(m.buyerId);
            return (
              <div key={a.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-ink">{b?.name ?? "Buyer"}</p>
                    <p className="text-sm text-slate-500">
                      {m.primaryAgentId === agent.id ? "Unlocked your listing" : "Looking for a property near you"}: {m.listingTitle}
                    </p>
                    <p className="text-xs text-slate-400">Accepted {dt(a.acceptedAt)}</p>
                  </div>
                  {b?.phone && (
                    <a href={`tel:${b.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
                      <Phone className="h-4 w-4" /> Call {b.phone}
                    </a>
                  )}
                </div>
                {myShop && (
                  <div className="mt-4">
                    <ShareShopButtons link={myShop} buyerName={b?.name} buyerPhone={b?.phone ?? null} agentName={agent.user.name} />
                  </div>
                )}
                <Link href={`/listings`} className="mt-3 inline-block text-xs font-bold text-brand-600 hover:underline">
                  Browse all listings
                </Link>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
