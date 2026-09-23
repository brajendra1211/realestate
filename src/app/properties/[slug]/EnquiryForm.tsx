"use client";

import { useActionState } from "react";
import { submitEnquiry, type SubmitEnquiryState } from "./actions";

const initialState: SubmitEnquiryState = {};

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
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Thanks! Your enquiry has been sent.
        </p>
      )}
      {state.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Please fill in your name and phone number.
        </p>
      )}

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="slug" value={slug} />
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultName}
          placeholder="Your name"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="tel"
          name="phone"
          required
          defaultValue={defaultPhone}
          placeholder="Phone number"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          placeholder="Email (optional)"
          suppressHydrationWarning
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <textarea
          name="message"
          rows={3}
          placeholder="Message (optional)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send enquiry"}
        </button>
      </form>
    </>
  );
}
