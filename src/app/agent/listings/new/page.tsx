import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";
import { NewListingSearchForm } from "./NewListingSearchForm";

type SearchParams = Promise<{
  city?: string;
  locality?: string;
  address?: string;
}>;

export default async function NewListingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">List a Property</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-900">Active Membership Plan Required</h2>
          <p className="mt-1 text-sm text-amber-800">
            Free listings are disabled. You must have an active Channel Partner plan to list properties.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/agent/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View Plans &amp; Activate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const isBasic = agent.planTier === "BASIC" || (activeSub?.plan && activeSub.plan.listingLimit < 100);
  const planLimit = activeSub?.plan?.listingLimit ?? (isBasic ? 10 : 999999);
  const currentCount = await prisma.agentListing.count({
    where: { agentId: agent.id, isDelisted: false },
  });

  const isAtLimit = planLimit < 999999 && currentCount >= planLimit;

  const { city, locality, address } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">List a Property</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            planLimit >= 999999
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : isAtLimit
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}
        >
          {planLimit >= 999999 ? "Prime: Unlimited Listings" : `Basic: ${currentCount}/${planLimit} Listings Used`}
        </span>
      </div>

      {isAtLimit ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">Basic Plan Limit Reached (10 / 10 Listings)</h2>
          <p className="mt-1 text-sm text-red-700">
            You have used all 10 listings included with the Channel Partner Basic Plan (₹1,000/mo). Upgrade to the Prime Plan (₹2,000/mo) for Unlimited property listings.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/agent/dashboard"
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Upgrade to Prime (Unlimited)
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Step 1 of 2 — enter the property&apos;s location. We&apos;ll check whether it&apos;s
            already listed under a Master Property ID before you add photos and price.
          </p>

          <NewListingSearchForm defaultCity={city} defaultLocality={locality} defaultAddress={address} />
        </>
      )}
    </div>
  );
}
