"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";

export type TabDef = { id: string; label: string; badge?: number; content: ReactNode };

/**
 * Client-side tabs whose panels are rendered by the server (so data stays server-fetched).
 * Also reacts to `#tab-<id>` links anywhere on the page, e.g. <a href="#tab-earnings">.
 */
export function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0].id);

  useEffect(() => {
    const sync = () => {
      const m = window.location.hash.match(/^#tab-(.+)$/);
      if (m && tabs.some((t) => t.id === m[1])) {
        setActive(m[1]);
        document.getElementById("tabs-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  return (
    <div id="tabs-root" className="scroll-mt-4">
      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`relative flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              active === t.id ? "text-white" : "text-slate-600 hover:text-ink"
            }`}
          >
            {active === t.id && (
              <motion.span
                layoutId="tabs-pill"
                className="absolute inset-0 rounded-xl bg-brand-600 shadow-md shadow-brand-600/25"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{t.label}</span>
            {t.badge ? (
              <span
                className={`relative rounded-full px-1.5 py-px text-[10px] font-black ${
                  active === t.id ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                }`}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div key={t.id} hidden={active !== t.id} className="mt-6 space-y-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
