import { createInvestor } from "./actions";

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in the investor's name, email, and phone.",
  duplicate: "An account with this email already exists.",
  agentNotFound: "Your agent profile could not be found.",
  notPrime: "Activate your Prime plan before registering investors.",
};

export default async function NewInvestorPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Register Investor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Registration fee is ₹20,000/year. Once admin confirms payment, an Investor Code is
        generated and ₹2,000 (10%) is credited to your wallet.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <form action={createInvestor} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Investor name</label>
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            name="phone"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Register Investor
        </button>
      </form>
    </div>
  );
}
