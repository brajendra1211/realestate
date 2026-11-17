"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { markLinkSentAction } from "./actions";

export function ShareLinkButtons({
  requestId,
  link,
  ownerName,
  phone,
}: {
  requestId: string;
  link: string;
  ownerName: string;
  phone: string;
}) {
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();

  const digits = phone.replace(/\D/g, "");
  const wa = `${digits.length === 10 ? "91" : ""}${digits}`;
  const text = `Hello ${ownerName}, this is your Pronesto channel partner. Please open this link and fill in your property details so I can list it: ${link}`;

  function whatsapp() {
    start(() => markLinkSentAction(requestId));
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this link", link);
    }
    start(() => markLinkSentAction(requestId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={whatsapp}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" /> Send link on WhatsApp
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-brand-600"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
