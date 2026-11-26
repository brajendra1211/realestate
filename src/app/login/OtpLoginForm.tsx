"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { blinkField } from "@/lib/blinkField";
import { requestLoginOtpAction, verifyLoginOtpAction } from "./otpActions";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";
const COOLDOWN = 60;

/** WhatsApp OTP sign-in for one panel (role). Step 1 sends the code, step 2 checks it; resend only after a minute. */
export function OtpLoginForm({ role, callbackUrl, allowEmail = true }: { role: string; callbackUrl: string; allowEmail?: boolean }) {
  const [identifier, setIdentifier] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ field: "identifier" | "code"; text: string } | null>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Switching panels starts fresh.
  useEffect(() => {
    setSentTo(null);
    setCode("");
    setError(null);
    setInfo(null);
  }, [role]);

  const onIdentifier = (v: string) => {
    // A phone number stops at 10 digits; anything with letters or @ is an email.
    if (!/[A-Za-z@]/.test(v)) {
      const digits = v.replace(/\D/g, "");
      if (digits.length > 10) return;
    }
    setIdentifier(v);
    if (sentTo) {
      setSentTo(null);
      setCode("");
    }
  };

  const fail = (field: "identifier" | "code", text: string) => {
    setError({ field, text });
    setTimeout(() => blinkField(field === "identifier" ? idRef.current : codeRef.current), 0);
  };

  const send = () => {
    setError(null);
    setInfo(null);
    if (identifier.trim().length < 10 && !/[A-Za-z@]/.test(identifier)) {
      return fail("identifier", "Enter your 10-digit mobile number.");
    }
    start(async () => {
      const r = await requestLoginOtpAction(role, identifier);
      if (r.error) return fail("identifier", r.error);
      setSentTo(r.identifier ?? identifier);
      setWait(COOLDOWN);
      setInfo(`Code sent on WhatsApp to ${r.identifier ?? identifier}.`);
    });
  };

  const verify = () => {
    setError(null);
    start(async () => {
      const r = await verifyLoginOtpAction(role, sentTo ?? identifier, code, callbackUrl);
      if (r.error) return fail("code", r.error);
      if (r.redirectTo) window.location.href = r.redirectTo;
    });
  };

  return (
    <div className="mt-5 space-y-4">
      {info && !error && <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">{info}</div>}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {allowEmail ? "Mobile number or email" : "Mobile number"}
        </label>
        <input
          ref={idRef}
          value={identifier}
          onChange={(e) => {
            if (error) setError(null);
            idRef.current?.classList.remove("field-error");
            onIdentifier(e.target.value);
          }}
          inputMode={allowEmail ? "text" : "numeric"}
          placeholder="e.g. 9876543210"
          className={`${field} mt-1.5`}
        />
        {error?.field === "identifier" && <p className="mt-1.5 text-xs font-semibold text-red-600">{error.text}</p>}
      </div>

      {sentTo && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">6-digit code</label>
          <input
            ref={codeRef}
            value={code}
            onChange={(e) => {
              if (error) setError(null);
              codeRef.current?.classList.remove("field-error");
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            inputMode="numeric"
            placeholder="______"
            className={`${field} mt-1.5 tracking-[0.4em]`}
          />
          {error?.field === "code" && <p className="mt-1.5 text-xs font-semibold text-red-600">{error.text}</p>}
        </div>
      )}

      {sentTo ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={verify}
            disabled={pending || code.length !== 6}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Checking…" : "Verify & sign in →"}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={pending || wait > 0}
            className="w-full text-center text-xs font-bold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#20ba59] disabled:opacity-50"
        >
          {pending ? "Sending code…" : "Send code on WhatsApp →"}
        </button>
      )}
    </div>
  );
}
