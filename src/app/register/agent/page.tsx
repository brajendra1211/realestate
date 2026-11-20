import { RegisterAgentForm } from "./RegisterAgentForm";
import { getAgentPlans } from "@/lib/agentPlans";

type PageProps = { searchParams: Promise<{ ref?: string }> };

export default async function AgentRegisterPage({ searchParams }: PageProps) {
  const { ref } = await searchParams;
  const referredByCode = ref ? decodeURIComponent(ref) : "";
  const plans = (await getAgentPlans()).map(({ id, name, tier, price, durationDays, months, listingLimit }) => ({
    id,
    name,
    tier,
    price,
    durationDays,
    months,
    listingLimit,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Register as a Channel Partner</h1>
      <p className="mt-1 text-sm text-slate-500">
        Submit your profile and compliance documents, then pay for your plan. On successful
        payment you are approved automatically and your Unique Channel Partner Code is issued.
      </p>

      {referredByCode && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white text-lg shadow">
            🤝
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Referral Invite
            </p>
            <p className="text-sm font-semibold text-slate-800">
              You were invited by Channel Partner{" "}
              <span className="font-mono font-black text-emerald-700">{referredByCode}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              They will earn a referral income once your Prime plan activates.
            </p>
          </div>
        </div>
      )}

      <RegisterAgentForm referredByCode={referredByCode} plans={plans} />

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
