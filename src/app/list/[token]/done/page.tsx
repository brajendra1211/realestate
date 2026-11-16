import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type SearchParams = Promise<{ slug?: string }>;

export default async function OwnerListingDonePage({ searchParams }: { searchParams: SearchParams }) {
  const { slug } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <h1 className="font-display mt-4 text-3xl font-semibold text-ink">Your property is live</h1>
      <p className="mt-2 text-sm text-slate-500">
        Thank you! Your channel partner will now handle enquiries and visits for your property.
      </p>
      {slug && (
        <Link href={`/listings/${slug}`} className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
          View your listing
        </Link>
      )}
    </div>
  );
}
