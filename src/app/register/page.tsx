import { RegisterForm } from "./RegisterForm";

type SearchParams = Promise<{ type?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type } = await searchParams;
  const accountType = type === "DEALER" ? "DEALER" : "OWNER";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">List a property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create an owner or dealer/broker account to add and manage your listings.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 text-xs sm:text-sm font-medium">
        <a
          href="/register?type=OWNER"
          className={`rounded-xl border px-2 py-2.5 text-center transition ${
            accountType === "OWNER"
              ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Property Owner
        </a>
        <a
          href="/register?type=DEALER"
          className={`rounded-xl border px-2 py-2.5 text-center transition ${
            accountType === "DEALER"
              ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Dealer / Broker
        </a>
        <a
          href="/register/agent"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-2.5 text-center text-emerald-800 font-bold hover:bg-emerald-100 transition shadow-xs"
        >
          Channel Partner 🌟
        </a>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 flex items-center justify-between">
        <span>Are you a Channel Partner / Agent?</span>
        <a
          href="/register/agent"
          className="font-bold underline hover:text-emerald-950 ml-2"
        >
          Agent Registration ➔
        </a>
      </div>

      <RegisterForm accountType={accountType} />

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
