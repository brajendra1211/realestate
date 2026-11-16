import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, btnGhost } from "@/components/admin/ui";
import { PartnersNav } from "@/components/admin/PartnersNav";
import { PartnersTab } from "./PartnersTab";
import { CommissionsTab } from "./CommissionsTab";
import { PayoutsTab } from "./PayoutsTab";

type SearchParams = Promise<Record<string, string | undefined>>;

const HEADINGS: Record<string, { title: string; description: string }> = {
  partners: {
    title: "Channel partners",
    description: "Review applications, activate Prime plans, and see each partner's earnings at a glance.",
  },
  commissions: {
    title: "Commissions",
    description: "Every rupee credited to a channel partner wallet — filter by partner or by how it was earned.",
  },
  payouts: {
    title: "Partner payouts",
    description: "Withdrawal requests from partner wallets. Transfer the net amount to their bank, then mark it paid.",
  },
};

export default async function AdminPartnersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "commissions" || rawTab === "payouts" ? rawTab : "partners";

  const [pendingPayouts, pendingPartners] = await Promise.all([
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.agentProfile.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AdminPage
      title={HEADINGS[tab].title}
      description={HEADINGS[tab].description}
      actions={
        <Link href="/admin/deals" className={btnGhost}>
          + Record deal
        </Link>
      }
    >
      <PartnersNav pendingPayouts={pendingPayouts} pendingPartners={pendingPartners} />
      {tab === "partners" && <PartnersTab searchParams={searchParams} />}
      {tab === "commissions" && <CommissionsTab searchParams={searchParams} />}
      {tab === "payouts" && <PayoutsTab searchParams={searchParams} />}
    </AdminPage>
  );
}
