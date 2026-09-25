import Link from "next/link";
import { UnifiedLoginCard } from "./UnifiedLoginCard";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-[85vh] bg-linear-to-b from-slate-50 via-white to-slate-100/70 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-all text-xs font-bold tracking-wide"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-black">
              B
            </span>
            <span>BayaEstate</span>
          </Link>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            Sign In to Your Account
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Instant OTP login for all users. Admin sign-in with credentials.
          </p>
        </div>

        {/* Centered Login Card */}
        <UnifiedLoginCard callbackUrl={callbackUrl ?? "/"} />

        {/* Security / Trust note under card */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-medium">
          <span>🔒 End-to-end encrypted</span>
          <span>•</span>
          <span>Official Real Estate Network</span>
        </div>
      </div>
    </div>
  );
}
