import { VerifyVisitForm } from "./VerifyVisitForm";

type SearchParams = Promise<{
  customerPhone?: string;
  masterId?: string;
  customerName?: string;
  channel?: string;
}>;

export default async function VerifyVisitPage({ searchParams }: { searchParams: SearchParams }) {
  const { customerPhone, masterId, customerName, channel } = await searchParams;

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

      <VerifyVisitForm customerPhone={customerPhone} masterId={masterId} customerName={customerName} />
    </div>
  );
}
