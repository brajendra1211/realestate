import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgentByCode } from "@/lib/agent";
import { generateQrDataUrl, getAgentShopUrl } from "@/lib/qr";
import { ShopClientView } from "./ShopClientView";

type Props = {
  params: Promise<{ agentCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agentCode } = await params;
  const agent = await getAgentByCode(agentCode);

  if (!agent) {
    return {
      title: "Agent Shop Not Found | BayaEstate",
      description: "The requested agent shop could not be found.",
    };
  }

  const shopName = agent.shopName || agent.user.name;
  const location = agent.shopAddress || agent.city || "NCR, India";
  const title = `${shopName} — Verified Real Estate Partner (${agent.agentCode})`;
  const description = `Browse verified properties for rent & sale by ${agent.user.name} (${agent.agentCode}) in ${location}. Contact directly on WhatsApp or Call.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: `/api/agent/qr?code=${encodeURIComponent(agent.agentCode || "")}`,
          width: 512,
          height: 512,
          alt: `QR Code for ${shopName}`,
        },
      ],
    },
  };
}

export default async function AgentShopPage({ params }: Props) {
  const { agentCode } = await params;
  const agent = await getAgentByCode(agentCode);

  if (!agent || !agent.agentCode) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
          🔍
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Agent Shop Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          We couldn&apos;t find an active agent shop with code <span className="font-mono font-bold text-slate-700">{agentCode}</span>.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/listings"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Browse All Listings
          </Link>
          <Link
            href="/register/agent"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Become an Agent
          </Link>
        </div>
      </div>
    );
  }

  const originUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shopUrl = getAgentShopUrl(agent.agentCode, originUrl);
  const qrDataUrl = await generateQrDataUrl(shopUrl, { width: 360, margin: 2 });

  const { auth } = await import("@/auth");
  const { isAgentShopUnlocked } = await import("@/lib/agentShopUnlock");
  const session = await auth();
  const initialUnlocked = await isAgentShopUnlocked(agent.id, session?.user?.id);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-6">
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Breadcrumb / Top Bar */}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span>/</span>
            <Link href="/listings" className="hover:text-slate-800">Listings</Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{agent.shopName || agent.user.name}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">Agent Shop</span>
        </div>

        <ShopClientView
          agentCode={agent.agentCode}
          name={agent.user.name}
          shopName={agent.shopName}
          shopAddress={agent.shopAddress}
          city={agent.city}
          phone={agent.user.phone || agent.alternatePhone || ""}
          alternatePhone={agent.alternatePhone}
          whatsappNumber={agent.user.whatsappNumber || agent.user.phone}
          avatar={agent.user.logoUrl}
          primeStatus={agent.primeStatus}
          yearsExperience={agent.yearsExperience}
          staffCount={agent.staffCount}
          reraNumber={agent.reraNumber}
          ratingAvg={agent.ratingAvg}
          ratingCount={agent.ratings.length}
          qrDataUrl={qrDataUrl}
          shopUrl={shopUrl}
          listings={agent.listings}
          initialUnlocked={initialUnlocked}
        />
      </main>
    </div>
  );
}
