import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SingleImageField } from "@/components/SingleImageField";
import { updateAgentProfileAction } from "./actions";

type SearchParams = Promise<{ saved?: string }>;

export default async function AgentProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    redirect("/login");
  }

  const { saved } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      agentProfile: {
        include: {
          referringAgent: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!user || !user.agentProfile) {
    redirect("/register/agent");
  }

  const agent = user.agentProfile;
  const isPrime = agent.primeStatus;
  const targetLight = agent.targetStatus || "YELLOW";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <Link href="/agent/dashboard" className="hover:text-blue-600 transition">
              ← Dashboard
            </Link>
            <span>/</span>
            <span>Profile & KYC</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Channel Partner Profile & Verification</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage your personal profile, 2 mobile numbers, PAN/Aadhaar KYC documents, and banking details with cancelled cheque.
          </p>
        </div>

        {agent.agentCode && (
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Partner Code</span>
              <p className="font-mono text-base font-black text-blue-900">{agent.agentCode}</p>
            </div>
          </div>
        )}
      </div>

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-2xs flex items-center gap-2">
          <span>✓</span>
          <span>Your profile, KYC documents, and banking details have been updated successfully!</span>
        </div>
      )}

      {/* Partner Overview & Status Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{user.name}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isPrime ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-200"
                }`}
              >
                {isPrime ? "★ Prime Member" : "Basic Member"}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Registered Phone: <span className="font-mono text-slate-100">{user.phone || "Not set"}</span>
              {user.secondaryPhone && (
                <> · Alt: <span className="font-mono text-slate-100">{user.secondaryPhone}</span></>
              )}
            </p>
            {agent.referringAgent && (
              <p className="text-xs text-indigo-300">
                Direct Upline Channel Partner: {agent.referringAgent.user.name} ({agent.referringAgent.agentCode})
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Target Status Traffic Light */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/10 text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-300">2-Month Target Status</span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-xs">
                {targetLight === "GREEN" ? (
                  <span className="text-emerald-400">🟢 Target Achieved</span>
                ) : targetLight === "YELLOW" ? (
                  <span className="text-amber-300">🟡 In Progress</span>
                ) : (
                  <span className="text-red-400">🔴 At Risk / Pending</span>
                )}
              </span>
            </div>

            <Link
              href="/agent/dashboard"
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 transition"
            >
              Marketing Tools →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Profile & KYC Edit Form */}
      <form action={updateAgentProfileAction} className="space-y-6">
        {/* Section 1: Basic & Contact Details (Name, Age, 2 Mobile Numbers, DOB, WhatsApp, Office Address, Email, Website) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">1. Personal & Business Information</h2>
              <p className="text-xs text-slate-500">
                Official contact info, 2 mobile numbers, date of birth, age, and office/shop address.
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
              <label className="text-xs font-bold text-slate-700">Primary Mobile Number (Login) *</label>
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
              <label className="text-xs font-bold text-slate-700">Secondary / Alternate Mobile Number</label>
              <input
                type="tel"
                name="secondaryPhone"
                placeholder="Any second contact number"
                defaultValue={user.secondaryPhone ?? agent.alternatePhone ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">WhatsApp Mobile Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                placeholder="For quick customer and upline chat"
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
              <label className="text-xs font-bold text-slate-700">Shop / Agency Name</label>
              <input
                type="text"
                name="shopName"
                placeholder="e.g. Om Sai Real Estate"
                defaultValue={agent.shopName ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Operating City</label>
              <input
                type="text"
                name="city"
                placeholder="City"
                defaultValue={agent.city ?? ""}
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
              <label className="text-xs font-bold text-slate-700">Current Office / Shop Address</label>
              <textarea
                name="shopAddress"
                rows={2}
                placeholder="Complete street address, landmark, area and pincode"
                defaultValue={agent.shopAddress ?? user.address ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Identity Proofs (PAN Card & Aadhaar Front / Back) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">2. Identity Proofs & KYC Documents</h2>
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
                Official bank details for direct commission wallet withdrawals and TDS payout transfers.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Payout Bank</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Account Holder Name</label>
              <input
                type="text"
                name="bankAccountName"
                placeholder="As per bank passbook / cheque"
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
                placeholder="e.g. HDFC0001234"
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
                  label="Cancelled Cheque Photo / Passbook Front Page"
                  defaultValue={user.cancelledChequeUrl}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Required for bank verification before admin releases wallet payout requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/agent/dashboard"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-xs hover:bg-blue-700 transition"
          >
            Save Profile & KYC Details
          </button>
        </div>
      </form>
    </div>
  );
}
