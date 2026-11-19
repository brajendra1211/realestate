import { DocPage } from "@/components/content/DocPage";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { blockText, type Block } from "@/components/content/DocBlocks";
import { JsonLd } from "@/components/JsonLd";
import faq from "@/content/docs/faq.json";

export const metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about listing, commissions, verification, legal protection and becoming a Prime Channel Partner on Pronesto.",
};

const items = faq as unknown as { q: string; a: Block[] }[];

export default function FaqPage() {
  return (
    <DocPage eyebrow="Help" title="Frequently Asked Questions" subtitle="Everything about listing, commission, verification and legal protection." bare>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a.map(blockText).join(" ") },
          })),
        }}
      />
      <FaqAccordion items={items} />
    </DocPage>
  );
}
