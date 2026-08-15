import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { uploadDocumentAction, createAgreementAction } from "./actions";

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

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default async function AdminDocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;

  const recentDocs = await prisma.documentVaultItem.findMany({
    include: {
      agent: { select: { agentCode: true } },
      investor: { select: { investorCode: true } },
      masterProperty: { select: { masterId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Document Vault Management</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Upload on behalf of any Agent Code / Investor Code, or record a Customer↔Investor
        agreement (§3.10).
      </p>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Document uploaded.
        </p>
      )}
      {saved === "agreement" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Agreement recorded.
        </p>
      )}
      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Something went wrong — check the codes entered and try again.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Upload a document</h2>
          <form action={uploadDocumentAction} className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input type="text" name="title" required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select name="type" defaultValue="OTHER" className={inputClass}>
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Agent Code (optional)</label>
              <input type="text" name="agentCode" placeholder="AGT-DEL-1024" className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Investor Code (optional)</label>
              <input type="text" name="investorCode" placeholder="INV-000001" className={inputClass} />
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Record a Customer↔Investor agreement</h2>
          <form action={createAgreementAction} className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Investor Code</label>
              <input type="text" name="investorCode" required placeholder="INV-000001" className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer name</label>
              <input type="text" name="customerName" required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer phone</label>
              <input type="tel" name="customerPhone" required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Agreement date</label>
              <input type="date" name="agreementDate" required className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Lock-in (months)</label>
                <input type="number" name="lockInPeriodMonths" min={0} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Unit number</label>
                <input type="text" name="flatUnitNumber" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Terms</label>
              <textarea name="terms" rows={2} className={inputClass} />
            </div>
            <DocumentUploadField name="signedCopyUrl" label="Signed copy (PDF)" />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Record agreement
            </button>
          </form>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Recent uploads</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {recentDocs.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No documents yet.</p>
        ) : (
          recentDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{doc.title}</p>
                <p className="text-xs text-slate-500">
                  {doc.type.replace(/_/g, " ")}
                  {doc.agent && ` · ${doc.agent.agentCode}`}
                  {doc.investor && ` · ${doc.investor.investorCode}`}
                  {doc.masterProperty && ` · ${doc.masterProperty.masterId}`}
                </p>
              </div>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
