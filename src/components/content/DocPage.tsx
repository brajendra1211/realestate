import Link from "next/link";
import type { ReactNode } from "react";
import { PageBanner } from "@/components/ui/PageBanner";

/** Shared shell for the content pages (About, Commission policy, FAQ, ...). */
export function DocPage({
  eyebrow,
  title,
  subtitle,
  children,
  wide = false,
  bare = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  /** No white card around the content (for pages that lay out their own cards). */
  bare?: boolean;
}) {
  return (
    <div className="bg-slate-50">
      <PageBanner art="home" eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className={`mx-auto px-4 py-10 sm:px-6 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Back to home
        </Link>
        {bare ? (
          <div className="mt-6">{children}</div>
        ) : (
          <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-10">{children}</div>
        )}
      </div>
    </div>
  );
}
