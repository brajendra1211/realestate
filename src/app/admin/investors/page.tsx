import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmInvestorPaymentAction } from "./actions";

type SearchParams = Promise<{ status?: string; saved?: string }>;

export default async function AdminInvestorsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { status, saved } = await searchParams;
  const filterStatus = status === "PAID" ? "PAID" : status === "ALL" ? undefined : "PENDING";

  const investors = await prisma.investorProfile.findMany({
    where: filterStatus ? { feeStatus: filterStatus } : {},
    include: { user: true, referringAgent: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const filterLink = (value: string) => `/admin/investors?status=${value}`;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Investors</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Confirm the ₹20,000/year registration fee to issue an Investor Code and credit the
        referring agent&apos;s wallet with the 10% referral commission.
      </p>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          { label: "Pending", value: "PENDING" },
          { label: "Paid", value: "PAID" },
          { label: "All", value: "ALL" },
        ].map((item) => (
          <a
            key={item.value}
            href={filterLink(item.value)}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              (filterStatus ?? "ALL") === item.value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {investors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No investors in this status.
          </p>
        ) : (
          investors.map((investor) => (
            <div
              key={investor.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{investor.user.name}</p>
                  {investor.investorCode && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                      {investor.investorCode}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      investor.feeStatus === "PAID"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {investor.feeStatus === "PAID" ? "Fee paid" : "Fee pending"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {investor.user.email} · {investor.user.phone}
                </p>
                <p className="text-xs text-slate-400">
                  Referred by{" "}
                  <span className="font-medium text-slate-600">
                    {investor.referringAgent.agentCode ?? investor.referringAgent.user.name}
                  </span>{" "}
                  · Fee ₹{investor.registrationFee.toLocaleString("en-IN")}
                  {investor.expiresAt && ` · expires ${investor.expiresAt.toLocaleDateString("en-IN")}`}
                </p>
              </div>
              {investor.feeStatus === "PENDING" && (
                <form action={confirmInvestorPaymentAction}>
                  <input type="hidden" name="id" value={investor.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Confirm ₹20,000 Payment Received
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
