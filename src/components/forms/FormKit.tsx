"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-xs transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 read-only:bg-slate-50 read-only:text-slate-600";

export function FormSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

type Kind = "text" | "upper" | "digits" | "letters" | "mobile";

const LETTERS_ONLY = /[^A-Za-z .'-]/g;

/**
 * Text input that enforces its rule as the user types:
 *  upper   -> forced CAPITALS (GST, PAN, IFSC)
 *  digits  -> numbers only (account number)
 *  letters -> alphabets only (names)
 *  mobile  -> 10-digit Indian mobile
 */
export function SmartInput({
  kind = "text",
  className,
  ...rest
}: { kind?: Kind } & InputHTMLAttributes<HTMLInputElement>) {
  const clean = (v: string) => {
    switch (kind) {
      case "upper":
        return v.toUpperCase();
      case "digits":
        return v.replace(/\D/g, "");
      case "mobile":
        return v.replace(/\D/g, "").slice(-10);
      case "letters":
        return v.replace(LETTERS_ONLY, "");
      default:
        return v;
    }
  };
  const extra: InputHTMLAttributes<HTMLInputElement> =
    kind === "digits"
      ? { inputMode: "numeric", pattern: "[0-9]{9,18}", title: "Digits only (9 to 18 digits)" }
      : kind === "mobile"
        ? { inputMode: "numeric", type: "tel", pattern: "[6-9][0-9]{9}", maxLength: 10, title: "10-digit mobile number" }
        : kind === "letters"
          ? { pattern: "[A-Za-z][A-Za-z .'\\-]*", title: "Letters only" }
          : kind === "upper"
            ? { autoCapitalize: "characters" }
            : {};
  return (
    <input
      {...extra}
      {...rest}
      className={`${inputCls} ${kind === "upper" ? "font-mono uppercase" : ""} ${className ?? ""}`}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const v = clean(e.target.value);
        if (v !== e.target.value) e.target.value = v;
        rest.onChange?.(e);
      }}
    />
  );
}

function ageFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Date of birth input; the age is worked out from it automatically (never typed). */
export function DobField({ name = "dateOfBirth" }: { name?: string }) {
  const [age, setAge] = useState<number | null>(null);
  const today = new Date();
  const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  return (
    <>
      <Field label="Date of birth" required hint="Must be 18 or older">
        <input
          type="date"
          name={name}
          required
          max={max}
          onChange={(e) => setAge(ageFromIso(e.target.value))}
          className={inputCls}
        />
      </Field>
      <Field label="Age" hint="Calculated from date of birth">
        <input
          type="text"
          readOnly
          tabIndex={-1}
          value={age !== null && age >= 0 ? `${age} years` : ""}
          placeholder="Auto-filled"
          className={inputCls}
        />
      </Field>
    </>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-brand-200 bg-brand-50 text-brand-800"
      }`}
    >
      {children}
    </div>
  );
}

export const primaryBtn =
  "w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-60";
