import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";
import type { BrochureData } from "@/lib/brochure";
import { BrochureView } from "@/components/agent/BrochureView";
import { BrochureScaler } from "@/components/agent/BrochureScaler";

export default async function BrochurePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { id } = await params;
  const b = await prisma.brochure.findUnique({ where: { id } });
  if (!b || b.agentId !== agent.id) notFound();
  const data = JSON.parse(b.data) as BrochureData;

  return (
    <div className="px-4 py-6">
      <Link href="/agent/brochures" className="no-print mb-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800">
        ← Back to brochures
      </Link>
      <BrochureScaler>
        <BrochureView d={data} />
      </BrochureScaler>
    </div>
  );
}
