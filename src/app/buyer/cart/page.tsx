import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart";
import { listWatchForBuyer } from "@/lib/watchlist";
import { cancelWatchAction, removeCartItemAction, sendCartToAgentAction, shareCartAction } from "./actions";

type SearchParams = Promise<{ link?: string; sent?: string; error?: string }>;

export default async function BuyerCartPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") redirect("/buyer/login?next=/buyer/cart");
  const { link, sent, error } = await searchParams;
  const [lines, watches] = await Promise.all([getCart(session.user.id), listWatchForBuyer(session.user.id)]);

  const input = "rounded-xl border border-slate-200 px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Property cart</h1>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {sent && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">Your cart was sent to the agent.</p>}
      {link && (
        <div className="space-y-2 rounded-xl bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Share this link:</p>
          <input readOnly value={link} className="w-full rounded-lg border border-green-200 bg-white px-3 py-2" />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`My property shortlist: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
          >
            Share on WhatsApp
          </a>
        </div>
      )}

      {lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Your cart is empty. Use &quot;Add to cart&quot; on any property.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image && <img src={l.image} alt="" className="h-20 w-28 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <Link href={l.kind === "listing" ? `/listings/${l.slug}` : `/properties/${l.slug}`} className="font-bold text-ink hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {l.city ?? ""} · ₹{l.price.toLocaleString("en-IN")}
                  </p>
                </div>
                <form action={removeCartItemAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-red-300 hover:text-red-600">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-start gap-4">
            <form action={shareCartAction}>
              <button type="submit" className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white">
                Share Cart
              </button>
            </form>
            <form action={sendCartToAgentAction} className="flex flex-wrap gap-2">
              <input name="agentCode" required placeholder="Agent code" className={input} />
              <input name="note" placeholder="Note (optional)" className={input} />
              <button type="submit" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
                Send to Agent
              </button>
            </form>
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink">My requirements</h2>
        {watches.length === 0 ? (
          <p className="text-sm text-slate-500">
            If a requirement finds no property nearby, it is saved here and we alert you as soon as a match is listed.
          </p>
        ) : (
          watches.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-soft">
              <div className="flex-1">
                <p className="font-bold text-ink">
                  {w.purpose} · {w.bhk ? `${w.bhk} BHK` : "Any size"}
                </p>
                <p className="text-slate-500">
                  {w.societyName ?? "Any society"} · within {w.radiusKm} km{w.budgetMax ? ` · up to ₹${w.budgetMax.toLocaleString("en-IN")}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{w.status}</span>
              {w.status === "ACTIVE" && (
                <form action={cancelWatchAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Cancel
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
