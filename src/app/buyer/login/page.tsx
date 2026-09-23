import { BuyerLoginForm } from "./BuyerLoginForm";

type SearchParams = Promise<{ identifier?: string; next?: string }>;

export default async function BuyerLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { identifier, next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Buyer login</h1>
      <p className="mt-1 text-sm text-slate-500">
        No password needed — we&apos;ll send a one-time code on WhatsApp (or email).
      </p>

      <BuyerLoginForm defaultIdentifier={identifier} next={next} />
    </div>
  );
}
