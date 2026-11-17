import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { PageBanner } from "@/components/ui/PageBanner";

export const metadata = {
  title: "Account & Data Deletion",
};

export default async function AccountDeletionPage() {
  const { siteName, contactEmail, contactPhone } = await getSiteSettings();
  const email = contactEmail ?? "support@pronesto.in";
  const phone = contactPhone ?? "";

  return (
    <div className="bg-slate-50">
      <PageBanner
        art="home"
        eyebrow="Legal"
        title="Account & Data Deletion"
        subtitle="Last updated: November 2026"
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to {siteName}
      </Link>

      <div className="mt-6 max-w-none space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-soft sm:p-10">
        <p>
          If you have a {siteName} account (as a buyer, channel partner, investor, or
          property owner) and would like it — and the personal data associated with it —
          deleted, follow the steps below.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">How to request deletion</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Send an email to{" "}
            <a className="text-brand-700 hover:underline" href={`mailto:${email}?subject=${encodeURIComponent(`${siteName} account deletion request`)}`}>
              {email}
            </a>{" "}
            with the subject line <strong>&quot;Account deletion request&quot;</strong>
            {phone ? (
              <>
                , or message us on WhatsApp at{" "}
                <a className="text-brand-700 hover:underline" href={`tel:${phone}`}>
                  {phone}
                </a>
              </>
            ) : null}
            .
          </li>
          <li>
            Include the phone number or email address registered on your {siteName} account,
            and your role (buyer, channel partner, investor, or property owner), so we can
            verify and locate your account.
          </li>
          <li>
            We will verify your request and confirm back to you, typically within{" "}
            <strong>7 business days</strong>.
          </li>
          <li>
            Once verified, your account and the data described below is deleted within{" "}
            <strong>30 days</strong> of confirmation.
          </li>
        </ol>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">What gets deleted</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your profile: name, phone number, email address, and photos.</li>
          <li>Saved and unlocked properties, enquiries, and saved searches.</li>
          <li>Location data and device/push notification tokens associated with your account.</li>
          <li>Ratings, messages, and in-app activity tied to your account.</li>
          <li>Your login credentials — you will no longer be able to sign in.</li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">What we retain, and why</h2>
        <p>
          Some information cannot be deleted immediately because we are legally required to
          keep it, or because it is shared, aggregated data that doesn&apos;t only concern
          you:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Payment and transaction records</strong> (listing fees, unlock passes,
            subscriptions, payouts) — retained for up to <strong>7 years</strong> to comply
            with Indian tax and accounting regulations.
          </li>
          <li>
            <strong>Records required for an active or disputed transaction</strong> (e.g. an
            in-progress deal, payout, or complaint involving another user) — retained until
            that matter is resolved.
          </li>
          <li>
            Aggregated or anonymized data that no longer identifies you (e.g. platform
            analytics) is not personal data and is not deleted.
          </li>
        </ul>
        <p>
          For more detail on how we handle your data generally, see our{" "}
          <Link className="text-brand-700 hover:underline" href="/privacy-policy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      </div>
    </div>
  );
}
