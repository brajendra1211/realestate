"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DocBlocks, type Block } from "@/components/content/DocBlocks";

export function FaqAccordion({ items }: { items: { q: string; a: Block[] }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={`overflow-hidden rounded-2xl border bg-white ${isOpen ? "border-brand-200 shadow-soft" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[15px] font-bold text-ink">
                Q{i + 1}. {it.q}
              </span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition ${isOpen ? "rotate-45" : ""}`}>
                <Plus className="h-4 w-4" />
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5">
                <DocBlocks blocks={it.a} skipFirstH1={false} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
