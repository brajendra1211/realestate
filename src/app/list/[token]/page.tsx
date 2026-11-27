import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, PhoneCall } from "lucide-react";
import { getRequestByFormToken } from "@/lib/listingRequest";
import { OwnerListingForm } from "./OwnerListingForm";

type Params = Promise<{ token: string }>;

export const metadata: Metadata = { title: "Add your property details", robots: { index: false, follow: false } };

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <LockKeyhole className="h-6 w-6" />
      </span>
      <h1 className="font-display mt-4 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white">
        Go to Pronesto
      </Link>
    </div>
  );
}

export default async function OwnerListingPage({ params }: { params: Params }) {
  const { token } = await params;
  const request = await getRequestByFormToken(token);

  if (!request || request.purpose === "SELL" || request.status === "PENDING_PAYMENT" || request.status === "ADMIN_DESK") {
    return <Notice title="This link is not active" text="Please start again from List a Property, or contact support." />;
  }
  if (request.status === "SUBMITTED" || request.detailsJson) {
    return <Notice title="Property details received" text="Your property is in process. A verified partner will visit and verify it within 48 hours." />;
  }
  if (request.status === "CANCELLED") {
    return <Notice title="Request cancelled" text="This listing request was cancelled. Please contact support." />;
  }

  const agent = request.acceptedAgent;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-[28px] bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-6 text-white shadow-lift sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-100">Hello {request.ownerName}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Add your property details</h1>
        <p className="mt-2 text-sm text-brand-100">
          Fill in your property details and photos. A verified partner near you will visit to verify them, and your listing goes live right after.
        </p>
        {agent?.user.phone && request.status !== "DETAILS_PENDING" && (
          <a href={`tel:${agent.user.phone}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
            <PhoneCall className="h-4 w-4" /> Call your partner
          </a>
        )}
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <OwnerListingForm token={token} city={request.city} />
      </div>
    </div>
  );
}
