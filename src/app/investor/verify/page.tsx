import { InvestorVerifyForm } from "./InvestorVerifyForm";

type SearchParams = Promise<{
  identifier?: string;
  channel?: string;
  resent?: string;
}>;

export default async function InvestorVerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const { identifier, channel, resent } = await searchParams;

  if (!identifier) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <p className="text-slate-600">Start by entering your phone number or email.</p>
        <a href="/investor/login" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
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
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Code resent.</p>
      )}

      <InvestorVerifyForm identifier={identifier} />
    </div>
  );
}
