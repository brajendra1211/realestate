import { DocPage } from "@/components/content/DocPage";
import { DocBlocks, type Block } from "@/components/content/DocBlocks";
import legal from "@/content/docs/legal.json";

export const metadata = {
  title: "Legal Protection Cell & Legal Success Stories",
  description: "Pronesto's real estate fraud protection and dispute resolution cell, with legal success stories from Noida and Greater Noida.",
};

export default function LegalCellPage() {
  return (
    <DocPage eyebrow="Legal cell" title="Legal Protection Cell & Success Stories" subtitle="Real estate fraud protection and dispute resolution." wide>
      <DocBlocks blocks={legal as Block[]} />
    </DocPage>
  );
}
