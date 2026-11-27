"use client";

import { useActionState, useEffect, useState } from "react";
import {
  registerAgent,
  sendRegisterOtpAction,
  createRegistrationOrderAction,
  confirmRegistrationPaymentAction,
  type RegisterAgentState,
} from "./actions";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { PlanPicker, type PickerPlan } from "@/components/agent/PlanPicker";
import {
  Alert,
  DobField,
  Field,
  FormSection,
  SmartInput,
  inputCls,
  primaryBtn,
} from "@/components/forms/FormKit";

export type RegisterPlan = PickerPlan;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Payment checkout could not load."));
    document.body.appendChild(s);
  });
}

const initialState: RegisterAgentState = {};

// No session exists yet while registering, so uploads use the public endpoint.
const UPLOAD = "/api/upload/registration-document";

const ERROR_MESSAGES: Record<string, string> = {
  otpInvalid: "The WhatsApp OTP is not correct or has expired. Please request a new one.",
  otpSendFailed: "We couldn't send the OTP right now. Please try again in a minute.",
  validation: "Please fill in your name, email, and an 8+ character password.",
  shopDetails: "Shop name, shop address, and city are required.",
  duplicate: "An account with this email already exists.",
  phoneInUse: "This mobile number is already registered with another account.",
  invalidName: "Name can only contain letters (A-Z).",
  invalidPhone: "Enter a valid 10-digit mobile number.",
  invalidBankName: "Account holder name can only contain letters (A-Z).",
  invalidAccountNumber: "Bank account number must be digits only (9 to 18 digits).",
  dobRequired: "Please enter your date of birth.",
  underAge: "You must be at least 18 years old to register.",
  documentsRequired: "Please upload all required documents (PAN, Aadhaar front & back, cancelled cheque).",
  planRequired: "Please choose a plan.",
  referrerNotFound: "That referring Channel Partner Code wasn't found — check it or leave it blank.",
};

// Mobile number + WhatsApp OTP: the number must be proven before the account is created.
function PhoneOtpFields() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const valid = /^[6-9]\d{9}$/.test(phone);

  async function send() {
    setBusy(true);
    setNote(null);
    const r = await sendRegisterOtpAction(phone);
    setBusy(false);
    if (r.ok) {
      setSent(true);
      setNote("OTP sent on WhatsApp.");
    } else {
      setNote(ERROR_MESSAGES[r.error] ?? "Could not send the OTP.");
    }
  }

  return (
    <>
      <Field label="Mobile number" required hint="10 digits. One mobile number can only be used for one account.">
        <input
          name="phone"
          required
          inputMode="numeric"
          maxLength={10}
          pattern="[6-9][0-9]{9}"
          placeholder="9876543210"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
            setSent(false);
          }}
          className={inputCls}
        />
        <button
          type="button"
          onClick={send}
          disabled={!valid || busy}
          className="mt-2 inline-flex cursor-pointer items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending…" : sent ? "Resend WhatsApp OTP" : "Send WhatsApp OTP"}
        </button>
        {note && <p className="mt-1 text-xs font-semibold text-slate-600">{note}</p>}
      </Field>
      <Field label="WhatsApp OTP" required hint="Enter the 6-digit code we sent to your WhatsApp.">
        <input name="otp" required inputMode="numeric" maxLength={6} placeholder={sent ? "6-digit OTP" : "Send the OTP first"} className={inputCls} />
      </Field>
    </>
  );
}

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function RegisterAgentForm({
  referredByCode = "",
  plans = [],
}: {
  referredByCode?: string;
  plans?: RegisterPlan[];
}) {
  const [state, formAction, pending] = useActionState(registerAgent, initialState);
  const hasRef = Boolean(referredByCode);
  // Default to Prime on the longest (best value) period.
  const [planId, setPlanId] = useState(
    [...plans].filter((p) => p.tier === "PRIME").sort((a, b) => b.months - a.months)[0]?.id ?? plans[0]?.id ?? ""
  );
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Account is saved first; then payment. Paid => auto-approved + plan active.
  // Not paid => stays pending for admin review, and the partner can pay later
  // from the dashboard.
  useEffect(() => {
    if (!state.redirectTo) return;
    const goNext = () => {
      window.location.href = state.redirectTo!;
    };
    if (!state.payNow) return goNext();

    let cancelled = false;
    (async () => {
      setPaying(true);
      try {
        const o = await createRegistrationOrderAction(planId);
        if (!o.ok) throw new Error("Payment is unavailable right now.");
        if (!o.order || !o.keyId) throw new Error("Payment is unavailable right now.");
        await loadCheckout();
        if (cancelled) return;
        new window.Razorpay!({
          key: o.keyId,
          amount: o.order.amount,
          currency: o.order.currency,
          order_id: o.order.id,
          name: "Pronesto",
          description: o.planName,
          handler: async (resp: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const r = await confirmRegistrationPaymentAction(planId, {
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            if (!r.ok) {
              setPayError("Payment received but activation failed - please contact support.");
              setPaying(false);
              return;
            }
            goNext();
          },
          modal: {
            ondismiss: () => {
              setPayError("Payment not completed. Your application is saved - you can pay later from your dashboard.");
              setPaying(false);
            },
          },
        }).open();
      } catch (e) {
        setPayError(e instanceof Error ? e.message : "Payment failed.");
        setPaying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state, planId]);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {state.error && <Alert>{ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}</Alert>}

      <FormSection step={1} title="About you" subtitle="Your personal and login details.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <SmartInput kind="letters" name="name" required placeholder="As on PAN card" />
          </Field>
          <Field label="Email" required>
            <input type="email" name="email" required suppressHydrationWarning className={inputCls} />
          </Field>
          <PhoneOtpFields />
          <Field label="Alternate mobile number">
            <SmartInput kind="mobile" name="alternatePhone" placeholder="Optional" pattern="([6-9][0-9]{9})?" />
          </Field>
          <Field label="WhatsApp number" hint="Leads are sent here. Defaults to your mobile number.">
            <SmartInput kind="mobile" name="whatsappNumber" placeholder="Optional" pattern="([6-9][0-9]{9})?" />
          </Field>
          <Field label="Website (optional)">
            <input type="url" name="website" placeholder="https://youragency.com" className={inputCls} />
          </Field>
          <DobField />
          <Field label="Password" required hint="At least 8 characters">
            <input type="password" name="password" required minLength={8} className={inputCls} />
          </Field>
        </div>
      </FormSection>

      <FormSection step={2} title="Office / shop" subtitle="Where you operate from.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Office / shop name" required>
            <input type="text" name="shopName" required className={inputCls} />
          </Field>
          <Field label="City" required>
            <input type="text" name="city" required className={inputCls} />
          </Field>
          <Field label="Office address" required wide>
            <textarea name="shopAddress" required rows={2} className={inputCls} />
          </Field>
          <Field label="Years of experience">
            <input type="number" name="yearsExperience" min={0} className={inputCls} />
          </Field>
          <Field label="Staff count">
            <input type="number" name="staffCount" min={0} className={inputCls} />
          </Field>
          <Field label="RERA registration number" hint="If entered, upload the RERA certificate below.">
            <SmartInput kind="upper" name="reraNumber" />
          </Field>
          <Field label="GST number" hint="Capitals are applied automatically. If entered, upload the GST certificate below.">
            <SmartInput kind="upper" name="gstNumber" maxLength={15} placeholder="22AAAAA0000A1Z5" />
          </Field>
          <Field
            label="Referred by (Channel Partner Code)"
            wide
            hint={
              hasRef
                ? "This code was set from the invite link and cannot be changed."
                : "If a Channel Partner referred you, enter their code — they earn a referral income once your plan activates."
            }
          >
            <input
              type="text"
              name="referredByAgentCode"
              defaultValue={referredByCode}
              readOnly={hasRef}
              placeholder="e.g. AGT-DEL-1024 (optional)"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        step={3}
        title="Identity & KYC documents"
        subtitle="Upload a PDF or a clear photo of each document."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="PAN number" required>
            <SmartInput kind="upper" name="panNumber" required placeholder="ABCDE1234F" maxLength={10} />
          </Field>
          <Field label="Aadhaar number" required>
            <SmartInput
              kind="digits"
              name="aadhaarNumber"
              required
              placeholder="12-digit Aadhaar"
              maxLength={12}
              pattern="[0-9]{12}"
              title="12-digit Aadhaar number"
            />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DocumentUploadField name="panCardUrl" label="PAN card" required endpoint={UPLOAD} />
          <DocumentUploadField name="aadhaarFrontUrl" label="Aadhaar (front)" required endpoint={UPLOAD} />
          <DocumentUploadField name="aadhaarBackUrl" label="Aadhaar (back)" required endpoint={UPLOAD} />
          <DocumentUploadField name="cancelledChequeUrl" label="Cancelled cheque" required endpoint={UPLOAD} />
          <DocumentUploadField name="reraDocUrl" label="RERA certificate" helpText="Needed only if you entered a RERA number" endpoint={UPLOAD} />
          <DocumentUploadField name="gstDocUrl" label="GST certificate" helpText="Needed only if you entered a GST number" endpoint={UPLOAD} />
          <DocumentUploadField name="tradeLicenseDocUrl" label="Property / trade license" helpText="Optional" endpoint={UPLOAD} />
        </div>
      </FormSection>

      <FormSection step={4} title="Bank details" subtitle="Where your commission is paid. Name must match the bank account.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account holder name" required>
            <SmartInput kind="letters" name="bankAccountName" required />
          </Field>
          <Field label="Account number" required hint="Digits only">
            <SmartInput kind="digits" name="bankAccountNumber" required />
          </Field>
          <Field label="IFSC code" required>
            <SmartInput kind="upper" name="bankIfsc" required placeholder="HDFC0001234" maxLength={11} />
          </Field>
          <Field label="Bank name & branch" required>
            <input type="text" name="bankName" required placeholder="e.g. HDFC Bank, Indirapuram" className={inputCls} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        step={5}
        title="Choose your plan"
        subtitle="Pay now and you are approved instantly, or skip and pay later from your dashboard."
      >
        <input type="hidden" name="planId" value={planId} />
        <PlanPicker plans={plans} value={planId} onChange={setPlanId} />
      </FormSection>

      {payError && <Alert tone="info">{payError}</Alert>}

      <div className="space-y-3">
        <button type="submit" name="intent" value="pay" disabled={pending || paying || !planId} className={primaryBtn}>
          {pending ? "Submitting…" : paying ? "Waiting for payment…" : "Submit & pay now"}
        </button>
        <button
          type="submit"
          name="intent"
          value="later"
          disabled={pending || paying}
          className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60"
        >
          Submit &amp; pay later
        </button>
        <p className="text-center text-xs text-slate-500">
          If you pay later, you can use your panel right away. You are approved automatically as soon as you pay
          from the dashboard — no admin step needed.
        </p>
      </div>
      {payError && state.redirectTo && (
        <a href={state.redirectTo} className="block text-center text-sm font-medium text-brand-600 hover:underline">
          Skip for now — go to dashboard
        </a>
      )}
    </form>
  );
}
