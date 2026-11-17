import type { ReactNode } from "react";

export type BannerArt = "home" | "buy" | "rent";

export const BANNER_ART: Record<BannerArt, string> = {
  home: "/brand/hero-home.svg",
  buy: "/brand/hero-buy.svg",
  rent: "/brand/hero-rent.svg",
};

/** Pronesto's own illustrated skyline, used behind page headers. */
export function BannerBackground({ art }: { art: BannerArt }) {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-bottom"
        style={{ backgroundImage: `url('${BANNER_ART[art]}')` }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/80 via-brand-950/30 to-transparent" />
    </>
  );
}

export function PageBanner({
  art = "home",
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  art?: BannerArt;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative isolate overflow-hidden rounded-[28px] px-6 pb-14 pt-10 text-white shadow-lift sm:px-10 sm:pb-16 sm:pt-12 ${className}`}>
      <BannerBackground art={art} />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300 ring-1 ring-white/15 backdrop-blur">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-200 sm:text-base">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}
