import { DocPage } from "@/components/content/DocPage";
import { ReviewCards, type Review } from "@/components/content/ReviewCards";
import reviews from "@/content/docs/reviews.json";

export const metadata = {
  title: "Market Reviews",
  description: "What tenants, buyers, owners and channel partners say about Pronesto.",
};

export default function ReviewsPage() {
  const groups = [...new Set((reviews as Review[]).map((r) => r.group ?? ""))];
  return (
    <DocPage eyebrow="Testimonials" title="Market Reviews" subtitle="For tenants, buyers, owners and channel partners." wide bare>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g}>
            {g && <h2 className="font-display mb-4 text-xl font-semibold text-ink">{g}</h2>}
            <ReviewCards reviews={(reviews as Review[]).filter((r) => (r.group ?? "") === g)} />
          </section>
        ))}
      </div>
    </DocPage>
  );
}
