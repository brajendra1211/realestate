"use client";

import { useActionState, useEffect } from "react";
import { registerAgent, type RegisterAgentState } from "./actions";
import { DocumentUploadField } from "@/components/DocumentUploadField";

const initialState: RegisterAgentState = {};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in your name, email, and an 8+ character password.",
  shopDetails: "Shop name, shop address, and city are required.",
  duplicate: "An account with this email already exists.",
  referrerNotFound: "That referring Agent Code wasn't found — check it or leave it blank.",
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function RegisterAgentForm() {
  const [state, formAction, pending] = useActionState(registerAgent, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            required
            suppressHydrationWarning
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Mobile number</label>
          <input
            type="tel"
            name="phone"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Alternate mobile number</label>
          <input
            type="tel"
            name="alternatePhone"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">WhatsApp mobile number</label>
          <input
            type="tel"
            name="whatsappNumber"
            placeholder="WhatsApp number for leads"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Website URL (optional)</label>
          <input
            type="url"
            name="website"
            placeholder="https://youragency.com"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Age</label>
          <input
            type="number"
            name="age"
            min={18}
            max={100}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Date of Birth (DOB)</label>
          <input
            type="date"
            name="dateOfBirth"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <hr className="border-slate-200" />

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Current Office / Shop Details</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Current office / shop name</label>
          <input
            type="text"
            name="shopName"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <input
            type="text"
            name="city"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Current office address</label>
          <textarea
            name="shopAddress"
            required
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Years of experience</label>
          <input
            type="number"
            name="yearsExperience"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Staff count</label>
          <input
            type="number"
            name="staffCount"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">RERA registration number</label>
          <input
            type="text"
            name="reraNumber"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">GST number</label>
          <input
            type="text"
            name="gstNumber"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            Referred by (Agent Code, optional)
          </label>
          <input
            type="text"
            name="referredByAgentCode"
            placeholder="AGT-DEL-1024"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            If another agent referred you, enter their Agent Code — they&apos;ll earn a 10%
            referral commission once your Prime plan activates.
          </p>
        </div>
      </div>

      <hr className="border-slate-200" />

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Identity Proof & KYC Documents</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">PAN Card Number</label>
          <input
            type="text"
            name="panNumber"
            placeholder="ABCDE1234F"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Aadhaar Card Number</label>
          <input
            type="text"
            name="aadhaarNumber"
            placeholder="12-digit Aadhaar Number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <DocumentUploadField name="panCardUrl" label="PAN Card Image / PDF" />
        <DocumentUploadField name="aadhaarFrontUrl" label="Aadhaar Card (Front)" />
        <DocumentUploadField name="aadhaarBackUrl" label="Aadhaar Card (Back)" />
        <DocumentUploadField name="reraDocUrl" label="RERA certificate (PDF)" />
        <DocumentUploadField name="tradeLicenseDocUrl" label="Property / trade license (PDF)" />
        <DocumentUploadField name="gstDocUrl" label="GST certificate (PDF)" />
      </div>

      <hr className="border-slate-200" />

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Banking Details & Cancelled Cheque</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Bank Account Holder Name</label>
          <input
            type="text"
            name="bankAccountName"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bank Account Number</label>
          <input
            type="text"
            name="bankAccountNumber"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">IFSC Code</label>
          <input
            type="text"
            name="bankIfsc"
            placeholder="HDFC0001234"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bank Name & Branch</label>
          <input
            type="text"
            name="bankName"
            placeholder="e.g. HDFC Bank, Indirapuram"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <DocumentUploadField name="cancelledChequeUrl" label="Cancelled Cheque (Image / PDF)" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}
