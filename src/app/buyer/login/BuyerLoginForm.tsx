"use client";

import { useActionState, useEffect } from "react";
import { requestBuyerOtp, type BuyerLoginState } from "./actions";

const initialState: BuyerLoginState = {};

const ERROR_MESSAGES: Record<string, string> = {
  required: "Enter your phone number or email address.",
  send: "Couldn't send the code. Please check your number/email and try again.",
};

export function BuyerLoginForm({
  defaultIdentifier,
  next,
}: {
  defaultIdentifier?: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(requestBuyerOtp, initialState);

  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-200/80 animate-fadeIn">
          <span>⚠️</span>
          <span>{ERROR_MESSAGES[state.error] ?? "Something went wrong. Try again."}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Phone Number (or Email)
        </label>
        <div className="relative mt-1.5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </span>
          <input
            type="text"
            name="identifier"
            required
            defaultValue={defaultIdentifier}
            placeholder="e.g. 9876543210 or yourname@gmail.com"
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal transition focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#25D366] hover:bg-[#20ba59] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-500/15 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {pending ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Sending Verification Code...</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.17c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.174 8.174 0 01-1.26-4.41c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4a8.156 8.156 0 012.4 5.8c0 4.52-3.68 8.2-8.2 8.2zm4.5-6.15c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.36-.77-1.86c-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.69.45-.04 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28z" />
            </svg>
            <span>Send Code on WhatsApp →</span>
          </>
        )}
      </button>
    </form>
  );
}
