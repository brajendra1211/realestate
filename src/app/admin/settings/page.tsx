import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SingleImageField } from "@/components/SingleImageField";
import { updateSiteSettings } from "../actions";

type SearchParams = Promise<{ saved?: string }>;

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  span = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        suppressHydrationWarning={type === "email"}
        className={inputClass}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved } = await searchParams;
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Website settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Branding, homepage lead-gen CTAs, and SEO metadata for the whole site.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <form action={updateSiteSettings} className="mt-6 max-w-3xl space-y-6">
        <Section title="Branding" description="Your site name and logo, shown across the whole site.">
          <Field label="Site name" name="siteName" defaultValue={settings?.siteName ?? "BayaEstate"} />
          <Field label="Tagline" name="tagline" defaultValue={settings?.tagline} />
          <SingleImageField name="logoUrl" label="Logo (navbar)" defaultValue={settings?.logoUrl} />
          <SingleImageField name="favicon" label="Favicon" defaultValue={settings?.favicon} />
        </Section>

        <Section
          title="Homepage & lead generation"
          description="The hero section and primary call-to-action buyers/sellers see first."
        >
          <Field label="Hero title" name="heroTitle" defaultValue={settings?.heroTitle} span />
          <TextAreaField label="Hero subtitle" name="heroSubtitle" defaultValue={settings?.heroSubtitle} />
          <SingleImageField name="heroImage" label="Hero background image" defaultValue={settings?.heroImage} />
          <Field label="CTA button text" name="ctaText" defaultValue={settings?.ctaText} placeholder="List a property" />
          <Field label="CTA button link" name="ctaLink" defaultValue={settings?.ctaLink} placeholder="/register" />
          <Field
            label="WhatsApp number (for chat button)"
            name="whatsappNumber"
            defaultValue={settings?.whatsappNumber}
            placeholder="+91 90000 00000"
          />
        </Section>

        <Section title="Contact details" description="Shown in the footer and used for structured data.">
          <Field label="Contact email" name="contactEmail" type="email" defaultValue={settings?.contactEmail} />
          <Field label="Contact phone" name="contactPhone" defaultValue={settings?.contactPhone} />
          <TextAreaField label="Contact address" name="contactAddress" defaultValue={settings?.contactAddress} />
        </Section>

        <Section
          title="SEO"
          description="Default meta title/description used site-wide when a page doesn't set its own. This drives how the site appears in Google search results and social shares — the most important part for organic traffic."
        >
          <Field
            label="Default meta title"
            name="metaTitle"
            defaultValue={settings?.metaTitle}
            placeholder={settings?.siteName ?? "BayaEstate"}
            span
          />
          <TextAreaField
            label="Default meta description"
            name="metaDescription"
            defaultValue={settings?.metaDescription}
            placeholder="Buy, sell, and rent homes with verified agents across the city."
          />
          <SingleImageField
            name="ogImage"
            label="Social share image (OG image)"
            defaultValue={settings?.ogImage}
          />
          <Field
            label="Google Analytics measurement ID"
            name="googleAnalyticsId"
            defaultValue={settings?.googleAnalyticsId}
            placeholder="G-XXXXXXXXXX"
          />
          <Field
            label="Google Search Console verification code"
            name="googleSiteVerification"
            defaultValue={settings?.googleSiteVerification}
            placeholder="content value from the meta tag"
          />
        </Section>

        <Section title="Social links">
          <Field label="Instagram" name="instagramUrl" type="url" defaultValue={settings?.instagramUrl} placeholder="https://instagram.com/…" />
          <Field label="Facebook" name="facebookUrl" type="url" defaultValue={settings?.facebookUrl} placeholder="https://facebook.com/…" />
          <Field label="YouTube" name="youtubeUrl" type="url" defaultValue={settings?.youtubeUrl} placeholder="https://youtube.com/…" />
          <Field label="LinkedIn" name="linkedinUrl" type="url" defaultValue={settings?.linkedinUrl} placeholder="https://linkedin.com/…" />
        </Section>

        <Section title="Footer">
          <TextAreaField label="Footer text" name="footerText" defaultValue={settings?.footerText} />
        </Section>

        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
