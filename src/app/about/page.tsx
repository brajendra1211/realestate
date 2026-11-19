import { DocPage } from "@/components/content/DocPage";
import { DocBlocks, type Block } from "@/components/content/DocBlocks";
import { CHALLENGES } from "@/content/site-copy";
import about from "@/content/docs/about.json";

export const metadata = {
  title: "About Us, Vision & Mission",
  description: "Pronesto is a cooperative, technology-driven prop-tech search engine for property owners, buyers and channel partners.",
};

export default function AboutPage() {
  return (
    <DocPage eyebrow="About Pronesto" title="About Us, Vision & Mission" subtitle="A transparent, tech-first bridge for owners, buyers and channel partners.">
      <DocBlocks blocks={about as Block[]} />

      <h2 className="font-display mt-12 border-t border-slate-100 pt-8 text-2xl font-semibold text-ink">Market challenges vs platform solutions</h2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-2 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 sm:grid">
          <div className="p-4">Traditional market challenge</div>
          <div className="border-l border-slate-200 p-4">Pronesto platform solution</div>
        </div>
        {CHALLENGES.map((c) => (
          <div key={c.problem[0]} className="grid border-t border-slate-200 text-sm sm:grid-cols-2">
            <div className="p-4">
              <p className="font-bold text-red-700">{c.problem[0]}</p>
              <p className="mt-1 text-slate-600">{c.problem[1]}</p>
            </div>
            <div className="border-t border-slate-200 bg-emerald-50/40 p-4 sm:border-l sm:border-t-0">
              <p className="font-bold text-emerald-700">{c.solution[0]}</p>
              <p className="mt-1 text-slate-600">{c.solution[1]}</p>
            </div>
          </div>
        ))}
      </div>
    </DocPage>
  );
}
