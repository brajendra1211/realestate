import { logVisitAction } from "../actions";

type SearchParams = Promise<{
  customerPhone?: string;
  masterId?: string;
  customerName?: string;
  channel?: string;
  error?: string;
}>;

const ERROR_MESSAGES: Record<string, string> = {
  invalidOtp: "That code is incorrect or has expired.",
  propertyNotFound: "No listing found with that Master Property ID.",
};

export default async function VerifyVisitPage({ searchParams }: { searchParams: SearchParams }) {
  const { customerPhone, masterId, customerName, channel, error } = await searchParams;

  if (!customerPhone || !masterId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <p className="text-slate-600">Start by entering the customer&apos;s phone number.</p>
        <a href="/agent/visits/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Back
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Enter the OTP</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sent to <span className="font-medium text-slate-700">{customerPhone}</span> via{" "}
        {channel === "EMAIL" ? "email" : "WhatsApp"}. Have the customer read it out to you.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={logVisitAction} className="mt-6 space-y-4">
        <input type="hidden" name="customerPhone" value={customerPhone} />
        <input type="hidden" name="masterId" value={masterId} />
        <input type="hidden" name="customerName" value={customerName ?? ""} />
        <div>
          <label className="text-sm font-medium text-slate-700">6-digit code</label>
          <input
            type="text"
            name="otp"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Verify & log visit
        </button>
      </form>
    </div>
  );
}
