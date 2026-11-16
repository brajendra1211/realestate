import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel,
  align = "left",
  tone = "light",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Reveal
      className={`flex flex-col gap-4 ${
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <span
            className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${
              dark ? "text-gold-300" : "text-brand-600"
            }`}
          >
            <span className={`h-px w-6 ${dark ? "bg-gold-300" : "bg-brand-600"}`} />
            {eyebrow}
          </span>
        )}
        <h2
          className={`font-display mt-2 text-3xl font-semibold leading-tight sm:text-4xl ${
            dark ? "text-white" : "text-ink"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-2 text-sm sm:text-base ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            dark
              ? "border-white/20 text-white hover:bg-white hover:text-ink"
              : "border-slate-200 text-ink hover:border-brand-600 hover:bg-brand-600 hover:text-white"
          }`}
        >
          {hrefLabel ?? "View all"}
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </Reveal>
  );
}
