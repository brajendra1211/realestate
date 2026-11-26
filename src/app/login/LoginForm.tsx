"use client";

import { useActionState, useEffect, useRef } from "react";
import { blinkField } from "@/lib/blinkField";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ callbackUrl, expectedRole }: { callbackUrl: string; expectedRole?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const pwError = Boolean(state.error && /password|incorrect|wrong/i.test(state.error));

  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo;
    }
    if (state.error) blinkField(pwError ? pwRef.current : idRef.current);
  }, [state, pwError]);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {expectedRole && <input type="hidden" name="expectedRole" value={expectedRole} />}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Email, Phone Number or Partner Code (ID)
        </label>
        <div className="relative mt-1.5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </span>
          <input
            ref={idRef}
            onChange={(e) => e.currentTarget.classList.remove("field-error")}
            type="text"
            name="email"
            required
            suppressHydrationWarning
            placeholder="e.g. admin@pronesto.in, 9876543210, or Partner Code"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </div>
        {state.error && !pwError && <p className="mt-1.5 text-xs font-semibold text-red-600">{state.error}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Password
          </label>
        </div>
        <div className="relative mt-1.5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            ref={pwRef}
            onChange={(e) => e.currentTarget.classList.remove("field-error")}
            type="password"
            name="password"
            required
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </div>
        {state.error && pwError && <p className="mt-1.5 text-xs font-semibold text-red-600">{state.error}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="shine flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
      >
        {pending ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Authenticating...</span>
          </>
        ) : (
          <span>Sign in with password →</span>
        )}
      </button>
    </form>
  );
}
