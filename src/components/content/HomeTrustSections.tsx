import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReviewCards, type Review } from "@/components/content/ReviewCards";
import { CHALLENGES, PUNCHLINES, TRUST_BADGES } from "@/content/site-copy";
import reviews from "@/content/docs/reviews.json";

/** Punchline banner, challenges-vs-solutions and a reviews teaser for the home page. */
export function HomeTrustSections() {
  const all = reviews as Review[];
  const teaser = [all[0], all[2], all[5]].filter(Boolean);
  return (
    <>
      <section className="relative overflow-hidden bg-brand-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{PUNCHLINES.power[0]}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{PUNCHLINES.hero[0]}</p>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {TRUST_BADGES.map((b) => (
              <li key={b} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-gold-300 ring-1 ring-white/15">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          align="center"
          eyebrow="Why Pronesto"
          title="Market challenges vs platform solutions"
          subtitle="What slows real estate down today, and how Pronesto fixes it."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CHALLENGES.map((c) => (
            <div key={c.problem[0]} className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Challenge</p>
                <p className="mt-1 font-bold text-ink">{c.problem[0]}</p>
                <p className="mt-1 text-sm text-slate-500">{c.problem[1]}</p>
              </div>
              <div className="mt-auto border-t border-slate-100 bg-emerald-50/50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Pronesto solution</p>
                <p className="mt-1 font-bold text-ink">{c.solution[0]}</p>
                <p className="mt-1 text-sm text-slate-600">{c.solution[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Market reviews"
            title="What tenants, owners and partners say"
            href="/reviews"
            hrefLabel="All reviews"
          />
          <div className="mt-10">
            <ReviewCards reviews={teaser} />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            More: <Link href="/case-studies" className="font-semibold text-brand-700 hover:underline">case studies</Link> ·{" "}
            <Link href="/legal-cell" className="font-semibold text-brand-700 hover:underline">legal success stories</Link> ·{" "}
            <Link href="/about" className="font-semibold text-brand-700 hover:underline">about us</Link>
          </p>
        </div>
      </section>
    </>
  );
}
