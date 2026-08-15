import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getDocumentsForAgent } from "@/lib/documentVault";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { uploadAgentDocumentAction, deleteAgentDocumentAction } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const DOC_TYPES = [
  "REGISTRY",
  "SALE_DEED",
  "AGREEMENT_TO_SELL",
  "ENCUMBRANCE_CERTIFICATE",
  "LAYOUT_PLAN",
  "PAYMENT_RECEIPT",
  "SIGNED_AGREEMENT",
  "OTHER",
] as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  REGISTRY: "Registry",
  SALE_DEED: "Sale Deed",
  AGREEMENT_TO_SELL: "Agreement to Sell",
  ENCUMBRANCE_CERTIFICATE: "Encumbrance Certificate",
  LAYOUT_PLAN: "Layout Plan",
  PAYMENT_RECEIPT: "Payment Receipt",
  SIGNED_AGREEMENT: "Signed Agreement",
  OTHER: "Other",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default async function AgentDocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, error } = await searchParams;
  const documents = await getDocumentsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
      <p className="mt-1 text-sm text-slate-500">
        Registry, sale deed, encumbrance certificate, layout plans, receipts — scoped to your
        Agent Code only (§3.10).
      </p>

      {saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Something went wrong. Try again.
        </p>
      )}

      <form action={uploadAgentDocumentAction} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input type="text" name="title" required className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Document type</label>
          <select name="type" defaultValue="OTHER" className={inputClass}>
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Master Property ID (optional)</label>
          <input type="text" name="masterId" placeholder="PROP-DEL-2026-8891" className={inputClass} />
        </div>
        <DocumentUploadField name="url" label="File (PDF)" />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Upload
        </button>
      </form>

      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {documents.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No documents yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{doc.title}</p>
                <p className="text-xs text-slate-500">
                  {DOC_TYPE_LABELS[doc.type]}
                  {doc.masterProperty && ` · ${doc.masterProperty.masterId}`} ·{" "}
                  {doc.createdAt.toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View
                </a>
                <form action={deleteAgentDocumentAction}>
                  <input type="hidden" name="id" value={doc.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
