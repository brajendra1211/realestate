import { DocPage } from "@/components/content/DocPage";
import { DocBlocks, type Block } from "@/components/content/DocBlocks";
import cases from "@/content/docs/cases.json";

export const metadata = {
  title: "Channel Partner & Owner Case Studies",
  description: "How channel partners and owners in Noida and Greater Noida closed deals on Pronesto.",
};

export default function CaseStudiesPage() {
  return (
    <DocPage eyebrow="Case studies" title="Channel Partner & Owner Case Studies" subtitle="Noida / Greater Noida">
      <DocBlocks blocks={cases as Block[]} />
    </DocPage>
  );
}
