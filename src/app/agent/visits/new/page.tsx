import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { NewVisitForm } from "./NewVisitForm";

type SearchParams = Promise<{ customerPhone?: string; masterId?: string }>;

export default async function NewVisitPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { customerPhone, masterId } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Log a site visit</h1>
      <p className="mt-1 text-sm text-slate-500">
        Mandatory mobile + OTP verification before logging any visit (§3.8) — this is what
        protects you from another agent poaching a customer you already showed a flat to.
      </p>

      <NewVisitForm defaultCustomerPhone={customerPhone} defaultMasterId={masterId} />
    </div>
  );
}
