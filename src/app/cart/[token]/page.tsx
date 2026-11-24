import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedCart } from "@/lib/cart";

type Params = Promise<{ token: string }>;

export default async function SharedCartPage({ params }: { params: Params }) {
  const { token } = await params;
  const cart = await getSharedCart(token);
  if (!cart) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Shared property cart</h1>
      {cart.note && <p className="rounded-xl bg-slate-50 p-3 text-slate-600">{cart.note}</p>}
      <ul className="space-y-3">
        {cart.lines.map((l) => (
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
          </li>
        ))}
      </ul>
    </div>
  );
}
