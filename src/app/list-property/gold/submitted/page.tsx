import Link from "next/link";

type SearchParams = Promise<{ slug?: string }>;

export default async function GoldListingSubmittedPage({ searchParams }: { searchParams: SearchParams }) {
  const { slug } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Submitted for review</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your ₹500 payment went through and your Gold listing (Master Property ID assigned
        automatically) is now in our moderation queue — an anti-fake-listing check, usually
        within 24 hours. Once approved, it goes live and is instantly pushed to every nearby
        Prime agent.
      </p>
      {slug && (
        <p className="mt-4 text-xs text-slate-400">
          Reference: <span className="font-mono">{slug}</span>
        </p>
      )}
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
