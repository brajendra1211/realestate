import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Access your admin or agent dashboard.
      </p>

      <LoginForm callbackUrl={callbackUrl ?? "/"} />

      <p className="mt-6 text-center text-sm text-slate-500">
        New agent or property owner?{" "}
        <a href="/register" className="font-medium text-blue-600 hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
