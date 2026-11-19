import { Star } from "lucide-react";

export type Review = { group: string | null; title: string; quote: string; author: string };

export function ReviewCards({ reviews }: { reviews: Review[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {reviews.map((r) => (
        <figure key={r.title + r.author} className="flex h-full flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft">
          <div className="flex gap-0.5 text-gold-400" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <figcaption className="mt-3 font-bold text-ink">{r.title}</figcaption>
          <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">“{r.quote}”</blockquote>
          <p className="mt-4 text-xs font-semibold text-slate-500">— {r.author}</p>
        </figure>
      ))}
    </div>
  );
}
