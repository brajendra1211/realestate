import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyUser, unverifyUser } from "../actions";

type SearchParams = Promise<{ search?: string; status?: string; saved?: string }>;

export default async function AdminBuyersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { search, status, saved } = await searchParams;

  const whereClause: any = {
    role: "BUYER",
  };

  if (status === "verified") {
    whereClause.verified = true;
  } else if (status === "pending") {
    whereClause.verified = false;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const buyers = await prisma.user.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          savedProperties: true,
          enquiries: true,
          visitAppointments: true,
          directVisits: true,
          propertyUnlocks: true,
          dispatchRequests: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const filterLink = (params: { status?: string }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (search) query.set("search", search);
    const qs = query.toString();
    return `/admin/buyers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buyers &amp; Customers</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            All registered buyers and customers who logged in via Mobile App or Website OTP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Total Buyers: {buyers.length}
          </span>
        </div>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved successfully.
        </p>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: "All", value: undefined },
            { label: "Verified", value: "verified" },
            { label: "Pending", value: "pending" },
          ].map((item) => (
            <a
              key={item.label}
              href={filterLink({ status: item.value })}
              className={`rounded-full border px-3 py-1.5 font-medium transition ${
                status === item.value || (!status && item.value === undefined)
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <form method="GET" action="/admin/buyers" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Search phone, name, email..."
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Search
          </button>
          {search && (
            <a
              href={`/admin/buyers${status ? `?status=${status}` : ""}`}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      {/* Buyers List */}
      <div className="mt-6 space-y-3">
        {buyers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <span className="text-3xl block mb-2">👥</span>
            <p className="font-semibold text-slate-700">No buyers found</p>
            <p className="text-xs text-slate-400 mt-1">
              Buyers will appear here automatically when they log in or book site visits via Mobile App or Website.
            </p>
          </div>
        ) : (
          buyers.map((buyer) => (
            <div
              key={buyer.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between shadow-xs hover:border-slate-300 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{buyer.name || "Customer / Buyer"}</p>
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                    BUYER
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      buyer.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {buyer.verified ? "Verified" : "Unverified"}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  📱 <span className="font-medium text-slate-900">{buyer.phone || "No phone"}</span>
                  {buyer.email && ` · ✉️ ${buyer.email}`}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    ❤️ Saved: {buyer._count.savedProperties}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    💬 Enquiries: {buyer._count.enquiries}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    📅 Visits: {buyer._count.visitAppointments + buyer._count.directVisits}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    🔓 Unlocks: {buyer._count.propertyUnlocks}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    🚗 Dispatch: {buyer._count.dispatchRequests}
                  </span>
                  <span className="text-slate-400">
                    Joined: {new Date(buyer.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <form action={buyer.verified ? unverifyUser : verifyUser}>
                  <input type="hidden" name="userId" value={buyer.id} />
                  <button
                    type="submit"
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      buyer.verified
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {buyer.verified ? "Unverify" : "Verify Profile"}
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
