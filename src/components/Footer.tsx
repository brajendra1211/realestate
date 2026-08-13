import Link from "next/link";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth={1.75} />
      <circle cx="12" cy="12" r="4" strokeWidth={1.75} />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M14 9h3V6h-3a4 4 0 00-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2a1 1 0 011-1z"
    />
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" strokeWidth={1.75} />
      <path d="M10.5 9.5l5 2.5-5 2.5v-5z" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.75} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M7 10v7M7 7v.01M11 17v-4.5a2 2 0 014-.3M11 12.5V17M15 12.5V17"
      />
    </>
  ),
};

function SocialLink({ href, kind }: { href: string; kind: keyof typeof SOCIAL_ICONS }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={kind}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        {SOCIAL_ICONS[kind]}
      </svg>
    </a>
  );
}

export function Footer({
  siteName,
  tagline,
  contactEmail,
  contactPhone,
  contactAddress,
  instagramUrl,
  facebookUrl,
  youtubeUrl,
  linkedinUrl,
}: {
  siteName: string;
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const socialLinks: { kind: keyof typeof SOCIAL_ICONS; href: string }[] = [];
  if (instagramUrl) socialLinks.push({ kind: "instagram", href: instagramUrl });
  if (facebookUrl) socialLinks.push({ kind: "facebook", href: facebookUrl });
  if (youtubeUrl) socialLinks.push({ kind: "youtube", href: youtubeUrl });
  if (linkedinUrl) socialLinks.push({ kind: "linkedin", href: linkedinUrl });

  return (
    <footer className="border-t border-slate-200 bg-slate-50 pb-20 sm:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-lg font-bold text-slate-900">{siteName}</p>
            {tagline && <p className="mt-2 text-sm text-slate-500">{tagline}</p>}
            {socialLinks.length > 0 && (
              <div className="mt-4 flex gap-2">
                {socialLinks.map((social) => (
                  <SocialLink key={social.kind} href={social.href} kind={social.kind} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Explore</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <Link href="/properties" className="hover:text-slate-800">
                Properties
              </Link>
              <Link href="/properties-in" className="hover:text-slate-800">
                Browse by Location
              </Link>
              <Link href="/projects" className="hover:text-slate-800">
                Projects
              </Link>
              <Link href="/developers" className="hover:text-slate-800">
                Developers
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">People</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <Link href="/dealers" className="hover:text-slate-800">
                Dealers
              </Link>
              <Link href="/owners" className="hover:text-slate-800">
                Owners
              </Link>
              <Link href="/register" className="hover:text-slate-800">
                List a property
              </Link>
              <Link href="/buyer/login" className="hover:text-slate-800">
                Buyer login
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Contact</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              {contactPhone && <a href={`tel:${contactPhone}`} className="hover:text-slate-800">{contactPhone}</a>}
              {contactEmail && <a href={`mailto:${contactEmail}`} className="hover:text-slate-800">{contactEmail}</a>}
              {contactAddress && <p>{contactAddress}</p>}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
