import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitRatingAction } from "./actions";

type Params = Promise<{ agentCode: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Pick a star rating from 1 to 5.",
};

export default async function RateAgentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { agentCode } = await params;
  const { saved, error } = await searchParams;

  const agent = await prisma.agentProfile.findUnique({
    where: { agentCode },
    include: { user: { select: { name: true } } },
  });
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Rate {agent.user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Agent Code <span className="font-mono">{agentCode}</span> — your feedback after a
        visit/deal helps other customers and affects this agent&apos;s search ranking (§3.9).
      </p>

      {saved === "1" ? (
        <p className="mt-6 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Thanks — your rating has been submitted.
        </p>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
            </p>
          )}
          <form action={submitRatingAction} className="mt-6 space-y-4">
            <input type="hidden" name="agentCode" value={agentCode} />
            <div>
              <label className="text-sm font-medium text-slate-700">Your phone number</label>
              <input
                type="tel"
                name="customerPhone"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rating</label>
              <select
                name="stars"
                required
                defaultValue=""
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="" disabled>
                  Select
                </option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                    {"☆".repeat(5 - n)} ({n})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Review (optional)</label>
              <textarea
                name="review"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Submit rating
            </button>
          </form>
        </>
      )}
    </div>
  );
}
