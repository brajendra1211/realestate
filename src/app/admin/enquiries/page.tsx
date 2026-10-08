import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminEnquiriesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const enquiries = await prisma.enquiry.findMany({
    include: { property: { select: { title: true, slug: true, locality: true, city: true, listingType: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 lg:p-10 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/admin" className="text-xs font-bold text-blue-600 hover:underline">
              ← Console Overview
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Lead CRM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Inquiries & Leads
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Total {enquiries.length} prospective buyer and tenant leads received through portal contact forms.
          </p>
        </div>
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm font-bold text-slate-700">No inquiries logged yet</p>
          <p className="text-xs text-slate-400 mt-1">Leads submitted on public listings will appear here in real time.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Target Property</th>
                  <th className="px-5 py-3.5">Message / Requirement</th>
                  <th className="px-5 py-3.5">Received Date</th>
                  <th className="px-5 py-3.5 text-right">Quick Connect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                          {enquiry.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{enquiry.name}</p>
                          <span className="text-[11px] text-slate-400">Direct Lead</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-mono font-bold text-slate-800 text-xs">{enquiry.phone}</p>
                      {enquiry.email && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{enquiry.email}</p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {enquiry.property ? (
                        <div>
                          <Link
                            href={`/properties/${enquiry.property.slug}`}
                            target="_blank"
                            className="font-bold text-blue-600 hover:underline line-clamp-1 text-xs"
                          >
                            {enquiry.property.title}
                          </Link>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {enquiry.property.locality || enquiry.property.city} · {enquiry.property.listingType}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          General Consultation
                        </span>
                      )}
                    </td>

                    <td className="max-w-xs px-5 py-4 text-xs text-slate-600">
                      {enquiry.message ? (
                        <p className="line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          &quot;{enquiry.message}&quot;
                        </p>
                      ) : (
                        <span className="text-slate-400">No custom message</span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {enquiry.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`tel:${enquiry.phone}`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/91${enquiry.phone.replace(/\D/g, "").slice(-10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
