import { GoldListingForm } from "@/components/GoldListingForm";

export default function GoldListingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Gold Membership self-listing</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pay ₹500 once and list your property directly. It goes through a quick moderation check,
        then gets auto-injected into every nearby Prime agent&apos;s CRM within 1–5 km — they do
        the work of finding you buyers/tenants (§3.4).
      </p>
      <div className="mt-6">
        <GoldListingForm />
      </div>
    </div>
  );
}
