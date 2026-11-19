import { DocPage } from "@/components/content/DocPage";
import { DocBlocks, type Block } from "@/components/content/DocBlocks";
import policy from "@/content/docs/commission.json";

export const metadata = {
  title: "Commission Policy",
  description: "Pronesto's zero platform commission policy and the standardised channel partner fee structure.",
};

export default function CommissionPolicyPage() {
  return (
    <DocPage eyebrow="Policy" title="Pronesto Commission Policy" subtitle="Zero platform commission. A fair, capped fee structure for channel partners.">
      <DocBlocks blocks={policy as Block[]} />
    </DocPage>
  );
}
