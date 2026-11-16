"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import { submitEnquiry, type SubmitEnquiryState } from "./actions";

const initialState: SubmitEnquiryState = {};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";

export function EnquiryForm({
  propertyId,
  slug,
  defaultName,
  defaultPhone,
  defaultEmail,
}: {
  propertyId: string;
  slug: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialState);

  return (
    <>
      {state.sent && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Thanks! Your enquiry has been sent.
        </p>
      )}
      {state.error && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> Please fill in your name and phone number.
        </p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="text" name="name" required defaultValue={defaultName} placeholder="Your name" className={inputCls} />
        <input type="tel" name="phone" required defaultValue={defaultPhone} placeholder="Phone number" className={inputCls} />
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          placeholder="Email (optional)"
          suppressHydrationWarning
          className={inputCls}
        />
        <textarea name="message" rows={3} placeholder="Message (optional)" className={inputCls} />
        <button
          type="submit"
          disabled={pending}
          className="shine inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {pending ? "Sending…" : "Send enquiry"}
        </button>
      </form>
    </>
  );
}
