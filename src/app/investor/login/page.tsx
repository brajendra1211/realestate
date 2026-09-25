import { InvestorLoginForm } from "./InvestorLoginForm";

type SearchParams = Promise<{ identifier?: string }>;

export default async function InvestorLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { identifier } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Referral Partner login</h1>
      <p className="mt-1 text-sm text-slate-500">
        Use the phone number or email your referring channel partner registered you with — we&apos;ll
        send a one-time code on WhatsApp (or email).
      </p>

      <InvestorLoginForm defaultIdentifier={identifier} />

      <p className="mt-6 text-center text-sm text-slate-500">
        Not registered yet? Ask your channel partner to add you as a referral partner — see{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          channel partner / admin login
        </a>{" "}
        instead.
      </p>
    </div>
  );
}
