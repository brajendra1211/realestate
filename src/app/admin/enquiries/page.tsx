import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminEnquiriesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const enquiries = await prisma.enquiry.findMany({
    include: { property: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enquiries</h1>
        <p className="mt-1 text-sm text-slate-500">{enquiries.length} total enquiries</p>
      </div>

      {enquiries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No enquiries yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enquiries.map((enquiry) => (
                <tr key={enquiry.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{enquiry.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {enquiry.phone}
                    {enquiry.email && <div className="text-xs text-slate-400">{enquiry.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {enquiry.property ? (
                      <Link
                        href={`/properties/${enquiry.property.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {enquiry.property.title}
                      </Link>
                    ) : (
                      "General"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{enquiry.message ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {enquiry.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
