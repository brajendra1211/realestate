import { requestBuyerOtp } from "./actions";

type SearchParams = Promise<{ error?: string; identifier?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  required: "Enter your phone number or email.",
  send: "Couldn't send the code. Check the number/email and try again.",
};

export default async function BuyerLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, identifier } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Buyer login</h1>
      <p className="mt-1 text-sm text-slate-500">
        No password needed — we&apos;ll send a one-time code on WhatsApp (or email).
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={requestBuyerOtp} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Phone number or email</label>
          <input
            type="text"
            name="identifier"
            required
            defaultValue={identifier}
            placeholder="98765 43210 or you@email.com"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Send code on WhatsApp
        </button>
      </form>
    </div>
  );
}
