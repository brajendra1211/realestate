import { NewInvestorForm } from "./NewInvestorForm";

export default async function NewInvestorPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Register Investor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Registration fee is ₹20,000/year. Once admin confirms payment, an Investor Code is
        generated and ₹2,000 (10%) is credited to your wallet.
      </p>

      <NewInvestorForm />
    </div>
  );
}
