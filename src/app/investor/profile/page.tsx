import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getInvestorByUserId } from "@/lib/investor";
import { SingleImageField } from "@/components/SingleImageField";
import { formatINR } from "@/lib/format";
import { updateInvestorProfileAction } from "./actions";

type SearchParams = Promise<{ saved?: string }>;

export default async function InvestorProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "INVESTOR") {
    redirect("/login");
  }

  const { saved } = await searchParams;
  const investor = await getInvestorByUserId(session.user.id);
  if (!investor) redirect("/investor/login");

  const user = investor.user;
  const referringAgent = investor.referringAgent;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <Link href="/investor/dashboard" className="hover:text-blue-600 transition">
              ← Dashboard
            </Link>
            <span>/</span>
            <span>Profile & KYC</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Referral Partner Profile & Legal Verification</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            KYC documents, 2 mobile numbers, bank details with cancelled cheque, and referring channel partner.
          </p>
        </div>

        {investor.investorCode && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Referral Partner Code</span>
            <p className="font-mono text-base font-black text-indigo-900">{investor.investorCode}</p>
          </div>
        )}
      </div>

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-2xs flex items-center gap-2">
          <span>✓</span>
          <span>Your referral partner profile, KYC, and banking details have been updated successfully!</span>
        </div>
      )}

      {/* Summary Cards: Capital, Joining, Referring Agent */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Investment Capital</span>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatINR(investor.totalInvested)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Joined: {investor.registeredAt ? investor.registeredAt.toLocaleDateString("en-IN") : "Pending"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Referring Channel Partner</span>
          <p className="mt-1 text-base font-black text-slate-900">
            {referringAgent?.user?.name ?? "Direct Agency"}
          </p>
          <p className="text-xs text-slate-500">
            Code: <span className="font-mono font-bold text-blue-600">{referringAgent?.agentCode ?? "—"}</span>
          </p>
          {referringAgent?.user?.phone && (
            <div className="mt-2 flex items-center gap-2">
              <a
                href={`tel:${referringAgent.user.phone}`}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
              >
                📞 Call
              </a>
              <a
                href={`https://wa.me/91${referringAgent.user.phone.replace(/\D/g, "").slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                💬 WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Legal Document Vault</span>
            <p className="mt-1 text-xs text-slate-600">
              Sale deeds, agreements, and bank loan records scoped to your investor code.
            </p>
          </div>
          <Link
            href="/investor/documents"
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Open Legal Vault →
          </Link>
        </div>
      </div>

      {/* Profile & Verification Form */}
      <form action={updateInvestorProfileAction} className="space-y-6">
        {/* Section 1: Personal & Contact Information */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">1. Personal & Contact Information</h2>
              <p className="text-xs text-slate-500">
                Full name, 2 mobile numbers, WhatsApp number, date of birth, and official address.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Contact</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={user.name}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                name="email"
                defaultValue={user.email ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Primary Mobile Number *</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="10-digit mobile number"
                defaultValue={user.phone ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Secondary Mobile Number</label>
              <input
                type="tel"
                name="secondaryPhone"
                placeholder="Any alternate contact number"
                defaultValue={user.secondaryPhone ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">WhatsApp Mobile Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                placeholder="For deal alerts and updates"
                defaultValue={user.whatsappNumber ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Date of Birth (DOB)</label>
              <input
                type="date"
                name="dateOfBirth"
                defaultValue={user.dateOfBirth ? user.dateOfBirth.toISOString().split("T")[0] : ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Age</label>
              <input
                type="number"
                name="age"
                min={18}
                max={100}
                placeholder="Years"
                defaultValue={user.age ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Website URL (optional)</label>
              <input
                type="url"
                name="website"
                placeholder="https://"
                defaultValue={user.website ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Current Office / Residence Address</label>
              <textarea
                name="address"
                rows={2}
                placeholder="Complete address with landmark and city"
                defaultValue={user.address ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Identity Proofs (PAN Card & Aadhaar Front / Back) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">2. Identity Proofs & Legal KYC</h2>
              <p className="text-xs text-slate-500">
                PAN card details and Aadhaar card front & back verification copies.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">KYC Proof</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">PAN Card Number</label>
              <input
                type="text"
                name="panNumber"
                placeholder="ABCDE1234F"
                maxLength={10}
                defaultValue={user.panNumber ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Aadhaar Card Number</label>
              <input
                type="text"
                name="aadhaarNumber"
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                defaultValue={user.aadhaarNumber ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <SingleImageField
                  name="panCardUrl"
                  label="PAN Card Photo"
                  defaultValue={user.panCardUrl}
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <SingleImageField
                  name="aadhaarFrontUrl"
                  label="Aadhaar Card Front"
                  defaultValue={user.aadhaarFrontUrl}
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <SingleImageField
                  name="aadhaarBackUrl"
                  label="Aadhaar Card Back"
                  defaultValue={user.aadhaarBackUrl}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Banking Details & Cancelled Cheque */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">3. Bank Account & Cancelled Cheque</h2>
              <p className="text-xs text-slate-500">
                Official bank account for profit share distribution payments and ROI credits.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Bank Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Account Holder Name</label>
              <input
                type="text"
                name="bankAccountName"
                placeholder="As per bank records"
                defaultValue={user.bankAccountName ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Bank Account Number</label>
              <input
                type="text"
                name="bankAccountNumber"
                placeholder="Account number"
                defaultValue={user.bankAccountNumber ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">IFSC Code</label>
              <input
                type="text"
                name="bankIfsc"
                placeholder="e.g. ICIC0001234"
                defaultValue={user.bankIfsc ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Bank Name & Branch</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="text"
                  name="bankName"
                  placeholder="Bank Name"
                  defaultValue={user.bankName ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  name="bankBranch"
                  placeholder="Branch"
                  defaultValue={user.bankBranch ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2 pt-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <SingleImageField
                  name="cancelledChequeUrl"
                  label="Cancelled Cheque Photo / Bank Statement Front"
                  defaultValue={user.cancelledChequeUrl}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Used for account verification before crediting profit distributions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Legal Papers Vault Reference */}
        <div className="rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50/60 to-purple-50/30 p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-indigo-950">4. Legal Documents & Property Papers</h2>
            <Link
              href="/investor/documents"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
            >
              Go to Document Vault →
            </Link>
          </div>
          <p className="text-xs text-slate-600">
            All legal paperwork associated with your investments is stored securely in your Document Vault:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="rounded-xl bg-white border border-indigo-100 p-2.5 shadow-2xs">
              <span className="font-bold text-slate-800">📄 Agreement to Sale</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Signed property deal</p>
            </div>
            <div className="rounded-xl bg-white border border-indigo-100 p-2.5 shadow-2xs">
              <span className="font-bold text-slate-800">🏦 Customer Bank Loan Papers</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Sanction letters & NOCs</p>
            </div>
            <div className="rounded-xl bg-white border border-indigo-100 p-2.5 shadow-2xs">
              <span className="font-bold text-slate-800">📑 Property Related Papers</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Registry & Title search</p>
            </div>
            <div className="rounded-xl bg-white border border-indigo-100 p-2.5 shadow-2xs">
              <span className="font-bold text-slate-800">🤝 Company-Investor Agreement</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Profit share terms</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/investor/dashboard"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-xs hover:bg-indigo-700 transition"
          >
            Save Referral Partner Profile & KYC
          </button>
        </div>
      </form>
    </div>
  );
}
