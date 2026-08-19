import { NewListingSearchForm } from "./NewListingSearchForm";

type SearchParams = Promise<{
  city?: string;
  locality?: string;
  address?: string;
}>;

export default async function NewListingPage({ searchParams }: { searchParams: SearchParams }) {
  const { city, locality, address } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">List a Property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step 1 of 2 — enter the property&apos;s location. We&apos;ll check whether it&apos;s
        already listed under a Master Property ID before you add photos and price.
      </p>

      <NewListingSearchForm defaultCity={city} defaultLocality={locality} defaultAddress={address} />
    </div>
  );
}
