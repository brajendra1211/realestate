import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvestorByUserId } from "@/lib/investor";
import { getDocumentsForInvestor, getAgreementsForInvestor } from "@/lib/documentVault";

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

export default async function InvestorDocumentsPage() {
  const session = await auth();
  if (!session) redirect("/investor/login");
  if (session.user.role !== "INVESTOR") redirect("/login");

  const investor = await getInvestorByUserId(session.user.id);
  if (!investor) redirect("/investor/login");

  const [documents, agreements] = await Promise.all([
    getDocumentsForInvestor(investor.id),
    getAgreementsForInvestor(investor.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
      <p className="mt-1 text-sm text-slate-500">
        Read-only — your agent or admin uploads documents here (§3.10).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Documents</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
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
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Customer agreements</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {agreements.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No agreements on file yet.</p>
        ) : (
          agreements.map((agreement) => (
            <div key={agreement.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">
                {agreement.customerName} — Unit {agreement.flatUnitNumber ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                {agreement.agreementDate.toLocaleDateString("en-IN")}
                {agreement.lockInPeriodMonths && ` · ${agreement.lockInPeriodMonths}mo lock-in`}
              </p>
              <a
                href={agreement.signedCopyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-blue-600 hover:underline"
              >
                View signed copy
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
