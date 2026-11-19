"use client";

import { useEffect, useRef } from "react";

// Keeps the fixed 794x1123 A4 brochure inside narrow screens, and offers print / save-as-PDF.
export function BrochureScaler({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fit() {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, (window.innerWidth - 32) / 794);
      inner.current.style.transform = `scale(${s})`;
      outer.current.style.width = `${794 * s}px`;
      outer.current.style.height = `${1123 * s}px`;
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div>
      <style>{`@media print{.no-print{display:none!important}body{background:#fff}.pn-outer{width:794px!important;height:1123px!important}.pn-inner{transform:none!important}@page{size:A4;margin:0}}`}</style>
      <div className="no-print mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Print / Save as PDF
        </button>
      </div>
      <div className="flex justify-center">
        <div ref={outer} className="pn-outer overflow-hidden" style={{ width: 794, height: 1123 }}>
          <div ref={inner} className="pn-inner" style={{ width: 794, transformOrigin: "top left" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
