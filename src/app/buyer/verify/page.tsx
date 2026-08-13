import { verifyBuyerOtp, resendBuyerOtp } from "./actions";

type SearchParams = Promise<{ identifier?: string; channel?: string; error?: string; resent?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  required: "Enter the code we sent you.",
  invalid: "That code is incorrect or has expired. Try again or resend.",
};

export default async function BuyerVerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const { identifier, channel, error, resent } = await searchParams;

  if (!identifier) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <p className="text-slate-600">Start by entering your phone number or email.</p>
        <a href="/buyer/login" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Enter your code</h1>
      <p className="mt-1 text-sm text-slate-500">
        We sent a 6-digit code to <span className="font-medium text-slate-700">{identifier}</span>{" "}
        via {channel === "EMAIL" ? "email" : "WhatsApp"}.
      </p>

      {resent === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Code resent.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={verifyBuyerOtp} className="mt-6 space-y-4">
        <input type="hidden" name="identifier" value={identifier} />
        <div>
          <label className="text-sm font-medium text-slate-700">6-digit code</label>
          <input
            type="text"
            name="otp"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Verify &amp; continue
        </button>
      </form>

      <form action={resendBuyerOtp} className="mt-3 text-center">
        <input type="hidden" name="identifier" value={identifier} />
        <button type="submit" className="text-sm font-medium text-blue-600 hover:underline">
          Resend code
        </button>
      </form>
    </div>
  );
}
