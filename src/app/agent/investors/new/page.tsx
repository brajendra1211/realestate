import { NewInvestorForm } from "./NewInvestorForm";
import { getSiteSettings } from "@/lib/site-settings";

export default async function NewInvestorPage() {
  const settings = await getSiteSettings();
  const fee = settings.investorRegistrationFee;
  const share = Math.round(fee * (settings.investorReferralPercent / 100));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl bg-brand-950 p-6 text-white shadow-lift sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Referral partner</p>
        <h1 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">Register a Referral Partner</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-300">
          Registration fee is ₹{fee.toLocaleString("en-IN")}/year. Once admin confirms payment, a Referral Partner Code
          is generated and ₹{share.toLocaleString("en-IN")} ({settings.investorReferralPercent}%) is credited to your
          wallet.
        </p>
      </div>

      <NewInvestorForm fee={fee} />
    </div>
  );
}
