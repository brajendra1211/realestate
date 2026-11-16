"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

/** Sends the partner's shop link (all their listings) to a buyer who has already paid. */
export function ShareShopButtons({
  link,
  buyerName,
  buyerPhone,
  agentName,
  label = "Send my listings on WhatsApp",
}: {
  link: string;
  buyerName?: string;
  buyerPhone?: string | null;
  agentName: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const digits = (buyerPhone ?? "").replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits.length === 10 ? "91" : ""}${digits}` : "https://wa.me/";
  const text = `Hello${buyerName ? ` ${buyerName}` : ""}, this is ${agentName} from Pronesto. Here are all my verified properties. Open the link to see full details of every listing: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this link", link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {buyerPhone !== undefined && (
        <a
          href={`${wa}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" /> {label}
        </a>
      )}
      <button
        type="button"
        onClick={copy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-brand-600"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy my listings link"}
      </button>
    </div>
  );
}
