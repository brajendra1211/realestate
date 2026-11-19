import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { PageBanner } from "@/components/ui/PageBanner";

export const metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPolicyPage() {
  const { siteName, contactEmail, contactPhone } = await getSiteSettings();
  const email = contactEmail ?? "support@pronesto.in";
  const phone = contactPhone ?? "";

  return (
    <div className="bg-slate-50">
      <PageBanner
        art="home"
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="Last updated: November 2026"
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to {siteName}
      </Link>

      <div className="mt-6 max-w-none space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-soft sm:p-10">
        <p>
          {siteName} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this website
          and the {siteName} mobile app (together, the &quot;Service&quot;), connecting
          property buyers, renters, and referral partners with verified channel partners (agents) and
          property owners. This policy explains what information we collect, how we use it,
          and the choices you have.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">1. Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> name, phone number, and email address when
            you register or sign in.
          </li>
          <li>
            <strong>Location:</strong> with your permission, approximate or precise device
            location, used to match you with nearby channel partners and properties, and to
            route dispatch requests.
          </li>
          <li>
            <strong>Camera:</strong> used only to scan a channel partner&apos;s QR code to
            view their verified profile — we do not store photos taken this way.
          </li>
          <li>
            <strong>Property and listing data:</strong> details you submit when listing a
            property, enquiries you send, and properties you save or unlock.
          </li>
          <li>
            <strong>Payment information:</strong> processed securely by our payment partner
            (Razorpay) for listing fees, unlock passes, and subscriptions — we do not store
            your card or bank details ourselves.
          </li>
          <li>
            <strong>Device and push notification data:</strong> a device token so we can send
            you app notifications (e.g. when a channel partner responds, or someone rings you
            about your listing).
          </li>
          <li>
            <strong>Usage data:</strong> pages viewed, searches made, and app interactions,
            used to improve the Service.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">2. How we use your information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and manage your account, and verify you via WhatsApp or email OTP.</li>
          <li>To connect buyers with the right channel partner or property owner.</li>
          <li>To send you notifications relevant to your activity — in the app and via WhatsApp.</li>
          <li>To process payments for listings, unlocks, and subscriptions.</li>
          <li>To maintain platform trust and safety (e.g. ratings, dispute resolution, fraud prevention).</li>
          <li>To comply with legal obligations and enforce our terms.</li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">3. Who we share information with</h2>
        <p>We share only what&apos;s necessary, and only with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Channel partners / property owners:</strong> your name, phone number, and
            enquiry details when you contact them about a specific property, or when you
            unlock a listing.
          </li>
          <li>
            <strong>Service providers:</strong> Razorpay (payments), Firebase (push
            notifications), and our WhatsApp messaging partners — strictly to operate the
            Service, under their own confidentiality obligations.
          </li>
          <li>
            <strong>Legal authorities:</strong> if required by law, or to protect the rights,
            property, or safety of {siteName}, our users, or the public.
          </li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">4. Data security</h2>
        <p>
          All data in transit is encrypted (HTTPS). We restrict access to personal data to
          personnel and systems that need it to operate the Service.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">5. Your choices and rights</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You can review and update your profile information from your dashboard.</li>
          <li>You can disable location or notification permissions at any time from your device settings.</li>
          <li>
            You can request access to, correction of, or deletion of your personal data by
            contacting us at the email below.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">6. Data retention</h2>
        <p>
          We retain account and transaction data for as long as your account is active, and
          as needed to comply with legal, accounting, or reporting obligations.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">7. Children&apos;s privacy</h2>
        <p>
          The Service is intended for users 18 years and older. We do not knowingly collect
          personal information from children.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">8. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be reflected by
          updating the &quot;Last updated&quot; date above.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-ink">9. Contact us</h2>
        <p>
          For any privacy-related questions or requests, contact us at{" "}
          <a className="text-brand-700 hover:underline" href={`mailto:${email}`}>
            {email}
          </a>
          {phone ? (
            <>
              {" "}
              or call{" "}
              <a className="text-brand-700 hover:underline" href={`tel:${phone}`}>
                {phone}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
      </div>
    </div>
  );
}
