"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mt-10 space-y-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div
            key={it.q}
            className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
              isOpen ? "border-brand-200 shadow-soft" : "border-slate-200"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[15px] font-bold text-ink">{it.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
              >
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
