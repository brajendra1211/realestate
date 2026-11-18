import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { PageBanner } from "@/components/ui/PageBanner";

export const metadata = { title: "Terms & Conditions" };

const H = "font-display mt-8 text-xl font-semibold text-ink";

export default async function TermsPage() {
  const { siteName, contactEmail } = await getSiteSettings();
  const email = contactEmail ?? "support@pronesto.in";

  return (
    <div className="bg-slate-50">
      <PageBanner art="home" eyebrow="Legal" title="Terms & Conditions" subtitle="Last updated: November 2026" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Back to {siteName}
        </Link>
        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-soft sm:p-10">
          <p>
            These terms apply to everyone who uses {siteName}: customers (buyers and renters), channel partners (agents), property
            owners and investors. By using the Service you accept them.
          </p>

          <h2 className={H}>1. Channel partners (agents)</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>A partner code needs an active monthly Basic or Prime membership. If a renewal is missed, your listings stay but move to the bottom of the feed and are hidden from customers until you renew.</li>
            <li>Commission earned stays in your wallet. Withdrawals are blocked while your membership is not active.</li>
            <li>Partners list rental properties only. Every listing must be genuine and the photos your own; a company watermark is added automatically.</li>
            <li>You must not bypass the platform to avoid commission, or contact a customer you did not receive through the platform without their consent.</li>
          </ul>

          <h2 className={H}>2. Customers</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>You can browse properties for free. A ₹100 fee unlocks full contact details and lets you buzz nearby partners.</li>
            <li>Buzzer use is limited to 3 times a day (1 hour apart) and 3 times a week, within 5 km of the area you first searched.</li>
            <li>BUY requirements are handled directly by our company deal team.</li>
            <li>You may replace a partner using &quot;Split Agent&quot;; that partner will not be shown to you again.</li>
          </ul>

          <h2 className={H}>3. Property owners</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Owners cannot list on their own. You choose a plan, and a verified partner in your area calls you and lists the property under their code.</li>
          </ul>

          <h2 className={H}>4. Investors</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Investor onboarding is subject to the investor agreement you sign. Returns are not guaranteed.</li>
          </ul>

          <h2 className={H}>5. Payments</h2>
          <p>All fees are charged through our payment partner and are non-refundable unless stated otherwise. Taxes (including GST and TDS) apply as required by law.</p>

          <h2 className={H}>6. Disputes</h2>
          <p>
            Commission conflicts and complaints can be raised from the Support page. We aim to audit and resolve them within 2 hours.
            Our decision after audit is final.
          </p>

          <h2 className={H}>7. Suspension</h2>
          <p>We may suspend or remove accounts or listings that are fraudulent, misleading or break these terms.</p>

          <h2 className={H}>8. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a className="text-brand-700 hover:underline" href={`mailto:${email}`}>
              {email}
            </a>
            . See also our{" "}
            <Link href="/privacy-policy" className="text-brand-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
