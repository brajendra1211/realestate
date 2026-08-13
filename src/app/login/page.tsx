import { login } from "./actions";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Access your admin or agent dashboard.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Invalid email or password.
        </p>
      )}

      <form action={login} className="mt-6 space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
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
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New agent or property owner?{" "}
        <a href="/register" className="font-medium text-blue-600 hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
