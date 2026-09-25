"use client";

import { useActionState, useEffect } from "react";
import { createInvestor, type CreateInvestorState } from "./actions";

import { DocumentUploadField } from "@/components/DocumentUploadField";

const initialState: CreateInvestorState = {};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in the referral partner's name, email, and phone.",
  duplicate: "An account with this email already exists.",
  agentNotFound: "Your channel partner profile could not be found.",
  notPrime: "Activate your Prime plan before registering referral partners.",
};

export function NewInvestorForm() {
  const [state, formAction, pending] = useActionState(createInvestor, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      {/* Section 1: Contact & Personal Info */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Personal & Contact Info</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Referral Partner Full Name</label>
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email Address</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Primary Mobile Number</label>
          <input
            type="tel"
            name="phone"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Alternate Mobile Number</label>
          <input
            type="tel"
            name="secondaryPhone"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">WhatsApp Mobile Number</label>
          <input
            type="tel"
            name="whatsappNumber"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Website URL (optional)</label>
          <input
            type="url"
            name="website"
            placeholder="https://..."
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
          <label className="text-sm font-medium text-slate-700">Current Office / Residence Address</label>
          <textarea
            name="address"
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Section 2: Identity & KYC Documents */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Identity Proof (Aadhaar & PAN)</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">PAN Card Number</label>
          <input
            type="text"
            name="panNumber"
            placeholder="ABCDE1234F"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Aadhaar Card Number</label>
          <input
            type="text"
            name="aadhaarNumber"
            placeholder="12-digit Aadhaar Number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <DocumentUploadField name="panCardUrl" label="PAN Card Image / PDF" />
        <DocumentUploadField name="aadhaarFrontUrl" label="Aadhaar Card (Front)" />
        <DocumentUploadField name="aadhaarBackUrl" label="Aadhaar Card (Back)" />
      </div>

      <hr className="border-slate-200" />

      {/* Section 3: Banking Details with Cancelled Cheque */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Banking Details for Profit Payouts</h3>
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
            placeholder="e.g. ICICI Bank, Sector 18"
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
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Registering…" : "Register Referral Partner (₹20,000 Fee)"}
      </button>
    </form>
  );
}
