import { register } from "./actions";

type SearchParams = Promise<{ error?: string; type?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in your name, email, and an 8+ character password.",
  duplicate: "An account with this email already exists.",
  company: "Company / agency name is required for a Dealer account.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, type } = await searchParams;
  const accountType = type === "DEALER" ? "DEALER" : "OWNER";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">List a property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create an owner or dealer/broker account to add and manage your listings.
      </p>

      {error && ERROR_MESSAGES[error] && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2 text-sm font-medium">
        <a
          href="/register?type=OWNER"
          className={`rounded-xl border px-3 py-2 text-center ${
            accountType === "OWNER"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 text-slate-600"
          }`}
        >
          Property Owner
        </a>
        <a
          href="/register?type=DEALER"
          className={`rounded-xl border px-3 py-2 text-center ${
            accountType === "DEALER"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 text-slate-600"
          }`}
        >
          Dealer / Broker
        </a>
      </div>

      <form action={register} className="mt-6 space-y-4">
        <input type="hidden" name="accountType" value={accountType} />
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
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
            suppressHydrationWarning
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            name="phone"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Company / Agency name{accountType === "DEALER" ? "" : " (optional)"}
          </label>
          <input
            type="text"
            name="company"
            required={accountType === "DEALER"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {accountType === "DEALER" && (
            <p className="mt-1 text-xs text-slate-400">
              Shown on your public dealer profile page for search visibility.
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
