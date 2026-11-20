"use client";

import { useActionState, useEffect } from "react";
import { createInvestor, type CreateInvestorState } from "./actions";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import {
  Alert,
  DobField,
  Field,
  FormSection,
  SmartInput,
  inputCls,
  primaryBtn,
} from "@/components/forms/FormKit";

const initialState: CreateInvestorState = {};

export const FORM_ERRORS: Record<string, string> = {
  validation: "Please fill in the referral partner's name, email, and phone.",
  duplicate: "An account with this email already exists.",
  phoneInUse: "This mobile number is already registered with another account.",
  invalidName: "Name can only contain letters (A-Z).",
  invalidPhone: "Enter a valid 10-digit mobile number.",
  invalidBankName: "Account holder name can only contain letters (A-Z).",
  invalidAccountNumber: "Bank account number must be digits only (9 to 18 digits).",
  dobRequired: "Please enter the date of birth.",
  underAge: "The referral partner must be at least 18 years old.",
  agentNotFound: "Your channel partner profile could not be found.",
  notPrime: "Your channel partner profile must be approved before you can register referral partners.",
};

export function NewInvestorForm({ fee = 20000 }: { fee?: number }) {
  const [state, formAction, pending] = useActionState(createInvestor, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {state.error && <Alert>{FORM_ERRORS[state.error] ?? "Something went wrong. Please try again."}</Alert>}

      <FormSection step={1} title="Personal & contact" subtitle="Who is the referral partner and how do we reach them?">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <SmartInput kind="letters" name="name" required placeholder="As on PAN card" />
          </Field>
          <Field label="Email address" required>
            <input type="email" name="email" required className={inputCls} />
          </Field>
          <Field label="Mobile number" required hint="10 digits. One mobile number can only be used for one account.">
            <SmartInput kind="mobile" name="phone" required placeholder="9876543210" />
          </Field>
          <Field label="Alternate mobile number">
            <SmartInput kind="mobile" name="secondaryPhone" placeholder="Optional" pattern="([6-9][0-9]{9})?" />
          </Field>
          <Field label="WhatsApp number">
            <SmartInput kind="mobile" name="whatsappNumber" placeholder="Optional" pattern="([6-9][0-9]{9})?" />
          </Field>
          <Field label="Website (optional)">
            <input type="url" name="website" placeholder="https://" className={inputCls} />
          </Field>
          <DobField />
          <Field label="Current office / residence address" wide>
            <textarea name="address" rows={2} className={inputCls} />
          </Field>
        </div>
      </FormSection>

      <FormSection step={2} title="Identity proof" subtitle="PAN and Aadhaar details with a copy of each (PDF or photo).">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="PAN number">
            <SmartInput kind="upper" name="panNumber" placeholder="ABCDE1234F" maxLength={10} />
          </Field>
          <Field label="Aadhaar number">
            <SmartInput kind="digits" name="aadhaarNumber" placeholder="12-digit Aadhaar" maxLength={12} pattern="[0-9]{12}" title="12-digit Aadhaar number" />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DocumentUploadField name="panCardUrl" label="PAN card" />
          <DocumentUploadField name="aadhaarFrontUrl" label="Aadhaar (front)" />
          <DocumentUploadField name="aadhaarBackUrl" label="Aadhaar (back)" />
        </div>
      </FormSection>

      <FormSection step={3} title="Bank details" subtitle="Used for profit payouts. Name must match the bank account.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account holder name">
            <SmartInput kind="letters" name="bankAccountName" />
          </Field>
          <Field label="Account number" hint="Digits only">
            <SmartInput kind="digits" name="bankAccountNumber" />
          </Field>
          <Field label="IFSC code">
            <SmartInput kind="upper" name="bankIfsc" placeholder="HDFC0001234" maxLength={11} />
          </Field>
          <Field label="Bank name & branch">
            <input type="text" name="bankName" placeholder="e.g. ICICI Bank, Sector 18" className={inputCls} />
          </Field>
        </div>
        <div className="mt-4">
          <DocumentUploadField name="cancelledChequeUrl" label="Cancelled cheque" />
        </div>
      </FormSection>

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Registering…" : `Register referral partner · ₹${fee.toLocaleString("en-IN")} fee`}
      </button>
    </form>
  );
}
