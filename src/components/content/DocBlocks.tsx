import type { ReactNode } from "react";

export type Run = [string, number];
export type Block = { k: "h1" | "h2" | "h3" | "h4" | "p" | "li"; r: Run[] };

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map(([t, b], i) =>
        b ? (
          <strong key={i} className="font-semibold text-ink">
            {t}
          </strong>
        ) : (
          <span key={i}>{t}</span>
        ),
      )}
    </>
  );
}

export const blockText = (b: Block) => b.r.map(([t]) => t).join("");

/** Renders converted .docx blocks (headings / paragraphs / bullet lists). The first h1 is skipped: pages show it in their banner. */
export function DocBlocks({ blocks, skipFirstH1 = true }: { blocks: Block[]; skipFirstH1?: boolean }) {
  const out: ReactNode[] = [];
  let list: Block[] = [];
  let skipped = !skipFirstH1;
  const flush = (key: number) => {
    if (!list.length) return;
    out.push(
      <ul key={`ul${key}`} className="list-disc space-y-1.5 pl-5">
        {list.map((b, i) => (
          <li key={i}>
            <Runs runs={b.r} />
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  blocks.forEach((b, i) => {
    if (b.k === "li") {
      list.push(b);
      return;
    }
    flush(i);
    if (b.k === "h1") {
      if (!skipped) {
        skipped = true;
        return;
      }
      out.push(
        <h2 key={i} className="font-display mt-10 text-2xl font-semibold text-ink">
          <Runs runs={b.r} />
        </h2>,
      );
    } else if (b.k === "h2") {
      out.push(
        <h2 key={i} className="font-display mt-10 border-t border-slate-100 pt-6 text-xl font-semibold text-ink">
          <Runs runs={b.r} />
        </h2>,
      );
    } else if (b.k === "h3") {
      out.push(
        <h3 key={i} className="mt-6 text-base font-bold text-ink">
          <Runs runs={b.r} />
        </h3>,
      );
    } else if (b.k === "h4") {
      out.push(
        <h4 key={i} className="mt-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          <Runs runs={b.r} />
        </h4>,
      );
    } else {
      out.push(
        <p key={i}>
          <Runs runs={b.r} />
        </p>,
      );
    }
  });
  flush(blocks.length);
  return <div className="space-y-4 text-sm leading-relaxed text-slate-700">{out}</div>;
}
