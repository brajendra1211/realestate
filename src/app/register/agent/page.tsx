import { registerAgent } from "./actions";
import { DocumentUploadField } from "@/components/DocumentUploadField";

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in your name, email, and an 8+ character password.",
  shopDetails: "Shop name, shop address, and city are required.",
  duplicate: "An account with this email already exists.",
};

export default async function AgentRegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Register as an Agent</h1>
      <p className="mt-1 text-sm text-slate-500">
        Submit your profile and compliance documents for admin verification. Once verified,
        admin will activate your Prime plan and issue your Unique Agent Code.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <form action={registerAgent} className="mt-6 space-y-4">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Shop / office name</label>
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
            <label className="text-sm font-medium text-slate-700">Shop / office address</label>
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
        </div>

        <hr className="border-slate-200" />

        <div className="space-y-4">
          <DocumentUploadField name="reraDocUrl" label="RERA certificate (PDF)" />
          <DocumentUploadField name="tradeLicenseDocUrl" label="Property / trade license (PDF)" />
          <DocumentUploadField name="gstDocUrl" label="GST certificate (PDF)" />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Submit for verification
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
