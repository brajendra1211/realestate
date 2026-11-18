import { DispatchTrigger } from "@/components/DispatchTrigger";

export default function DispatchNewPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Tell us what you need</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pick your requirement from the dropdowns. Rent, Sell and Let-out go to nearby Prime partners instantly; Buy goes to our company deal team.
      </p>
      <div className="mt-8">
        <DispatchTrigger />
      </div>
    </div>
  );
}
