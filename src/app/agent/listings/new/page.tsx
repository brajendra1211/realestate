import { searchMasterProperty } from "./actions";

type SearchParams = Promise<{
  error?: string;
  city?: string;
  locality?: string;
  address?: string;
}>;

const ERROR_MESSAGES: Record<string, string> = {
  notPrime: "Activate your Prime plan before listing properties.",
  validation: "City and address are required.",
  geocode: "Could not locate that address on the map. Please refine it and try again.",
};

export default async function NewListingPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, city, locality, address } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">List a Property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step 1 of 2 — enter the property&apos;s location. We&apos;ll check whether it&apos;s
        already listed under a Master Property ID before you add photos and price.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <form action={searchMasterProperty} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <input
            type="text"
            name="city"
            required
            defaultValue={city}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Locality / Society (optional)</label>
          <input
            type="text"
            name="locality"
            defaultValue={locality}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Full address</label>
          <textarea
            name="address"
            required
            rows={2}
            defaultValue={address}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Check for existing listings
        </button>
      </form>
    </div>
  );
}
