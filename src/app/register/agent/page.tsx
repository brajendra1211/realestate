import { RegisterAgentForm } from "./RegisterAgentForm";

export default async function AgentRegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Register as an Agent</h1>
      <p className="mt-1 text-sm text-slate-500">
        Submit your profile and compliance documents for admin verification. Once verified,
        admin will activate your Prime plan and issue your Unique Agent Code.
      </p>

      <RegisterAgentForm />

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
