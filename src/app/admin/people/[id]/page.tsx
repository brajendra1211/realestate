import { EditUserCard } from "../ManageUser";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarCheck,
  FileText,
  Heart,
  IdCard,
  Mail,
  MessageSquare,
  Phone,
  Radar,
  Unlock,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR, PAYMENT_MODE_LABELS } from "@/lib/format";
import { verifyUser, unverifyUser } from "../../actions";
import { AdminPage, StatCard, Pill, EmptyState, btnGhost, btnSuccess, btnDanger } from "@/components/admin/ui";
import { getPaymentTracker, STREAMS, summarize, type PayRow } from "@/lib/paymentTracker";

type Params = Promise<{ id: string }>;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SUBADMIN: "Sub-admin",
  OWNER: "Owner",
  BUYER: "Buyer",
  AGENT: "Channel partner",
  INVESTOR: "Referral partner (investor)",
};

const BACK: Record<string, { href: string; label: string }> = {
  OWNER: { href: "/admin/people?role=OWNER", label: "All people" },
  BUYER: { href: "/admin/people?role=BUYER", label: "All people" },
  INVESTOR: { href: "/admin/people?role=INVESTOR", label: "All people" },
  AGENT: { href: "/admin/people?role=AGENT", label: "All people" },
  SUBADMIN: { href: "/admin/people?role=TEAM", label: "All people" },
  ADMIN: { href: "/admin/people?role=TEAM", label: "All people" },
};

const date = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—");
const dateTime = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const mask = (v: string | null | undefined) => (v ? `${"•".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : "—");

function Card({ title, icon: Icon, children, count }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; count?: number }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        {title}
        {count !== undefined && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="col-span-2 break-words font-semibold text-ink">{v || "—"}</dd>
    </div>
  );
}

export default async function AdminPersonPage({ params, searchParams }: { params: Params; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  const { id } = await params;
  const { saved: editSaved, error: editError } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      agentProfile: true,
      investorProfile: { include: { referringAgent: { include: { user: { select: { id: true, name: true, phone: true } } } } } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { properties: true, savedProperties: true, enquiries: true, propertyUnlocks: true, dispatchRequests: true, visitAppointments: true, directVisits: true } },
    },
  });
  if (!user) notFound();

  const isBuyer = user.role === "BUYER";
  const isLister = user.role === "OWNER" || user.role === "SUBADMIN";

  const [referrer, properties, enquiriesMade, saved, visits, unlocks, dispatches, ledger, investorLedger, investorExtra] = await Promise.all([
    user.referredByAgentId
      ? prisma.agentProfile.findUnique({ where: { id: user.referredByAgentId }, include: { user: { select: { name: true } } } })
      : null,
    isLister
      ? prisma.property.findMany({
          where: { ownerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, title: true, slug: true, city: true, locality: true, listingType: true, price: true, status: true, approvalStatus: true, createdAt: true },
        })
      : [],
    isBuyer
      ? prisma.enquiry.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { property: { select: { title: true, slug: true } } } })
      : [],
    isBuyer
      ? prisma.savedProperty.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { property: { select: { title: true, slug: true, city: true } } } })
      : [],
    isBuyer
      ? prisma.visitAppointment.findMany({ where: { buyerId: user.id }, orderBy: { scheduledAt: "desc" }, take: 20, include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } } })
      : [],
    isBuyer
      ? prisma.propertyUnlock.findMany({
          where: { buyerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            assignedAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
            agentListing: {
              select: {
                title: true,
                slug: true,
                price: true,
                exactAddress: true,
                listingType: true,
                propertyType: true,
                bedrooms: true,
                masterProperty: { select: { city: true, locality: true } },
                agent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
              },
            },
            buyerInterest: { include: { acceptances: { include: { agent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } } } } } },
          },
        })
      : [],
    isBuyer
      ? prisma.dispatchRequest.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { acceptedAgent: { select: { agentCode: true } } } })
      : [],
    user.agentProfile
      ? prisma.commissionLedgerEntry.findMany({ where: { agentId: user.agentProfile.id }, orderBy: { createdAt: "desc" }, take: 15 })
      : [],
    user.investorProfile
      ? prisma.investorLedgerEntry.findMany({ where: { investorProfileId: user.investorProfile.id }, orderBy: { createdAt: "desc" }, take: 15 })
      : [],
    user.investorProfile
      ? Promise.all([
          prisma.profitDistribution.findMany({ where: { investorProfileId: user.investorProfile.id }, orderBy: { distributedAt: "desc" }, take: 10 }),
          prisma.customerInvestorAgreement.findMany({ where: { investorId: user.investorProfile.id }, orderBy: { agreementDate: "desc" }, take: 10 }),
          prisma.documentVaultItem.findMany({ where: { investorId: user.investorProfile.id }, orderBy: { createdAt: "desc" }, take: 20 }),
          prisma.investorLedgerEntry.aggregate({ where: { investorProfileId: user.investorProfile.id }, _sum: { amount: true } }),
        ])
      : null,
  ]);

  const back = BACK[user.role] ?? BACK.ADMIN;

  // More of what this person did / has: partner shop unlocks and site visits (buyer), listing requests with the partner handling each (owner).
  const [shopUnlocks, directVisits, listingRequests] = await Promise.all([
    isBuyer
      ? prisma.agentShopUnlock.findMany({
          where: { buyerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { agent: { select: { agentCode: true, shopName: true, user: { select: { name: true, phone: true } } } } },
        })
      : [],
    isBuyer
      ? prisma.directPropertyVisit.findMany({
          where: { buyerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { agentListing: { select: { title: true, slug: true } } },
        })
      : [],
    user.role === "OWNER"
      ? prisma.listingRequest.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            acceptedAgent: { select: { agentCode: true, shopName: true, user: { select: { name: true, phone: true } } } },
            agentListing: {
              select: {
                title: true,
                slug: true,
                price: true,
                exactAddress: true,
                listingExpiresAt: true,
                isDelisted: true,
                approvalStatus: true,
                agent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
              },
            },
          },
        })
      : [],
  ]);

  // Every payment this person has made (or still owes), across all payment types.
  const tracker = await getPaymentTracker({ userId: user.id });
  const paymentRows: (PayRow & { stream: string })[] = STREAMS.flatMap((s) =>
    tracker[s.key].map((r) => ({ ...r, stream: s.label }))
  ).sort((a, b) => b.at.getTime() - a.at.getTime());
  const paySummary = summarize(paymentRows);
  const hasKyc = user.panNumber || user.aadhaarNumber || user.bankAccountNumber || user.panCardUrl || user.aadhaarFrontUrl || user.cancelledChequeUrl;

  return (
    <AdminPage
      title={user.name}
      description={`${ROLE_LABEL[user.role] ?? user.role} · joined ${date(user.createdAt)}`}
      actions={
        <>
          <Link href={back.href} className={btnGhost}>
            <ArrowLeft className="h-4 w-4" /> {back.label}
          </Link>
          {user.role !== "ADMIN" && (
            <form action={user.verified ? unverifyUser : verifyUser}>
              <input type="hidden" name="id" value={user.id} />
              <button type="submit" className={user.verified ? btnDanger : btnSuccess}>
                {user.verified ? "Unverify" : "Verify profile"}
              </button>
            </form>
          )}
        </>
      }
    >
      {editError && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{editError}</p>}
      {editSaved && <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">Saved.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="blue">{ROLE_LABEL[user.role] ?? user.role}</Pill>
        <Pill tone={user.verified ? "green" : "amber"}>{user.verified ? "Verified" : "Not verified"}</Pill>
        {user.agentProfile && <Pill tone="violet">{user.agentProfile.agentCode ?? "No partner code yet"}</Pill>}
        {user.investorProfile?.investorCode && <Pill tone="violet">{user.investorProfile.investorCode}</Pill>}
      </div>

      <EditUserCard user={user} isSelf={user.id === session.user.id} />

      <Card title="Payment check" icon={Banknote} count={paymentRows.length}>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="neon-chip is-green">✓ Paid {formatINR(paySummary.paidAmount)} ({paySummary.paid})</span>
          {paySummary.unpaid > 0 ? (
            <span className="neon-chip is-red">✕ Not paid {formatINR(paySummary.unpaidAmount)} ({paySummary.unpaid})</span>
          ) : (
            <span className="neon-chip is-muted">Nothing pending</span>
          )}
        </div>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-slate-400">No payments recorded for this person yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-cyan-400/15">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">For</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">How</th>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-400/10">
                {paymentRows.map((r) => (
                  <tr key={`${r.stream}-${r.id}`}>
                    <td className="px-4 py-2.5">
                      <span className={`neon-chip ${r.status === "PAID" ? "is-green" : r.status === "UNPAID" ? "is-red" : "is-violet"}`}>
                        {r.status === "PAID" ? "✓ Paid" : r.status === "UNPAID" ? "✕ Not paid" : "Free credit"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-ink">{r.stream}</span>
                      {r.detail && <span className="block text-xs text-slate-400">{r.detail}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-ink">{formatINR(r.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.method}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{dateTime(r.at)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{r.ref ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card title="Contact" icon={Phone}>
            <dl className="divide-y divide-slate-100">
              <Row k="Phone" v={user.phone && <a className="text-brand-600 hover:underline" href={`tel:${user.phone}`}>{user.phone}</a>} />
              <Row k="Alt. phone" v={user.secondaryPhone} />
              <Row k="Date of birth" v={user.dateOfBirth ? `${date(user.dateOfBirth)}${user.age != null ? ` (${user.age} yrs)` : ""}` : user.age != null ? `${user.age} yrs` : null} />
              <Row k="WhatsApp" v={user.whatsappNumber} />
              <Row k="Email" v={user.email && <a className="text-brand-600 hover:underline" href={`mailto:${user.email}`}>{user.email}</a>} />
              <Row k="Company" v={user.company} />
              <Row k="Address" v={user.address} />
              <Row k="Website" v={user.website} />
              <Row k="Licence no." v={user.licenseNumber} />
              <Row
                k="Referred by"
                v={
                  referrer && (
                    <Link href={`/admin/partners?tab=partners&status=ALL&q=${referrer.agentCode ?? ""}`} className="text-brand-600 hover:underline">
                      {referrer.user.name} ({referrer.agentCode})
                    </Link>
                  )
                }
              />
            </dl>
          </Card>

          {(hasKyc || user.role === "INVESTOR" || user.role === "AGENT") && (
            <Card title="KYC & bank" icon={IdCard}>
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  ["PAN card", user.panCardUrl],
                  ["Aadhaar front", user.aadhaarFrontUrl],
                  ["Aadhaar back", user.aadhaarBackUrl],
                  ["Cancelled cheque", user.cancelledChequeUrl],
                ].map(([label, url]) => (
                  <span key={label} className={`neon-chip ${url ? "is-green" : "is-red"}`}>
                    {url ? "✓" : "✕"} {label}
                  </span>
                ))}
              </div>
              <dl className="divide-y divide-slate-100">
                <Row k="PAN" v={user.panNumber} />
                <Row k="Aadhaar" v={user.aadhaarNumber} />
                <Row k="Bank" v={user.bankName} />
                <Row k="Account holder" v={user.bankAccountName} />
                <Row k="Account no." v={user.bankAccountNumber} />
                <Row k="IFSC" v={user.bankIfsc} />
                <Row k="Branch" v={user.bankBranch} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["PAN card", user.panCardUrl],
                  ["Aadhaar front", user.aadhaarFrontUrl],
                  ["Aadhaar back", user.aadhaarBackUrl],
                  ["Cancelled cheque", user.cancelledChequeUrl],
                ].map(([label, url]) =>
                  url ? (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                      <FileText className="h-4 w-4" /> {label}
                    </a>
                  ) : null,
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {isBuyer && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Saved" value={user._count.savedProperties} icon={Heart} tone="rose" />
                <StatCard label="Enquiries" value={user._count.enquiries} icon={MessageSquare} />
                <StatCard label="Visits" value={user._count.visitAppointments + user._count.directVisits} icon={CalendarCheck} tone="green" />
                <StatCard label="Unlocks" value={user._count.propertyUnlocks} hint={`${user._count.dispatchRequests} dispatch`} icon={Unlock} tone="violet" />
              </div>

              <Card title="Enquiries sent" icon={MessageSquare} count={user._count.enquiries}>
                {enquiriesMade.length === 0 ? (
                  <p className="text-sm text-slate-500">No enquiries yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {enquiriesMade.map((e) => (
                      <li key={e.id} className="py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {e.property ? (
                            <Link href={`/properties/${e.property.slug}`} className="font-semibold text-brand-600 hover:underline">{e.property.title}</Link>
                          ) : (
                            <span className="font-semibold text-slate-500">Property removed</span>
                          )}
                          <span className="text-xs text-slate-400">{dateTime(e.createdAt)}</span>
                        </div>
                        {e.message && <p className="mt-1 text-slate-600">{e.message}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Shortlisted properties" icon={Heart} count={user._count.savedProperties}>
                {saved.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing shortlisted.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {saved.map((s) => (
                      <Link key={s.id} href={`/properties/${s.property.slug}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-600">
                        {s.property.title} · {s.property.city}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Site visits" icon={CalendarCheck} count={visits.length}>
                {visits.length === 0 ? (
                  <p className="text-sm text-slate-500">No visits booked.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {visits.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          <b>{v.bookingCode}</b> · with {v.agent.user.name} ({v.agent.agentCode})
                        </span>
                        <span className="flex items-center gap-2">
                          <Pill tone={v.status === "SCHEDULED" ? "blue" : v.status === "COMPLETED" ? "green" : "slate"}>{v.status}</Pill>
                          <span className="text-xs text-slate-400">{dateTime(v.scheduledAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Paid unlocks" icon={Unlock} count={unlocks.length}>
                {unlocks.length === 0 ? (
                  <p className="text-sm text-slate-500">No unlocks.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {unlocks.map((u) => {
                      const l = u.agentListing;
                      const where = [l.masterProperty?.locality, l.masterProperty?.city].filter(Boolean).join(", ");
                      const owner = l.agent ? `${l.agent.user.name} (${l.agent.agentCode ?? "partner"})` : "Company / admin listing";
                      const accepted = u.buyerInterest?.acceptances ?? [];
                      return (
                        <li key={u.id} className="space-y-1 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link href={`/listings/${l.slug}`} className="font-semibold text-brand-600 hover:underline">{l.title}</Link>
                            <span className="text-xs text-slate-400">{dateTime(u.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {[l.bedrooms ? `${l.bedrooms} BHK` : null, l.propertyType.replace(/_/g, " ").toLowerCase(), l.listingType === "RENT" ? "for rent" : "for sale", where].filter(Boolean).join(" · ")} · {formatINR(l.price)}{l.listingType === "RENT" ? "/mo" : ""}
                          </p>
                          <p className="text-xs text-slate-500">Address: {l.exactAddress}</p>
                          <p className="text-xs text-slate-500">
                            Listed by: <b>{owner}</b>
                            {u.assignedAgent ? <> · Assigned to: <b>{u.assignedAgent.user.name} ({u.assignedAgent.agentCode})</b></> : " · No partner assigned"}
                          </p>
                          <p className="text-xs font-semibold text-slate-600">
                            Paid {formatINR(u.amount)} · partner share {formatINR(u.agentSplit)} · company {formatINR(u.companySplit)}
                          </p>
                          {u.buyerInterest && (
                            <p className="text-xs text-slate-500">
                              Buzzer: {u.buyerInterest.status}, buzzed {u.buyerInterest.buzzCount}×.{" "}
                              {accepted.length > 0
                                ? `Taken by ${accepted.map((x) => `${x.agent.user.name} (${x.agent.agentCode})`).join(", ")}`
                                : "No partner has taken it yet."}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card title="Partner shop unlocks" icon={Unlock} count={shopUnlocks.length}>
                {shopUnlocks.length === 0 ? (
                  <p className="text-sm text-slate-500">None.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {shopUnlocks.map((s2) => (
                      <li key={s2.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          {formatINR(s2.amount)} · {s2.agent.user.name} ({s2.agent.agentCode}) {s2.agent.shopName ? `· ${s2.agent.shopName}` : ""}
                        </span>
                        <span className="text-xs text-slate-400">{dateTime(s2.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Direct site visits" icon={CalendarCheck} count={directVisits.length}>
                {directVisits.length === 0 ? (
                  <p className="text-sm text-slate-500">None.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {directVisits.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <Link href={`/listings/${v.agentListing.slug}`} className="font-semibold text-brand-600 hover:underline">{v.agentListing.title}</Link>
                        <span className="flex items-center gap-2">
                          <Pill tone={v.otpVerified ? "green" : "amber"}>{v.otpVerified ? "Verified" : "Not verified"}</Pill>
                          <span className="text-xs text-slate-400">{dateTime(v.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Dispatch requests" icon={Radar} count={dispatches.length}>
                {dispatches.length === 0 ? (
                  <p className="text-sm text-slate-500">No dispatch requests.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {dispatches.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          {formatINR(d.amount)} · {d.acceptedAgent ? `accepted by ${d.acceptedAgent.agentCode}` : "no agent yet"}
                        </span>
                        <span className="flex items-center gap-2">
                          <Pill tone={d.status === "MATCHED" ? "green" : "amber"}>{d.status}</Pill>
                          <span className="text-xs text-slate-400">{dateTime(d.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {isLister && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Listings" value={user._count.properties} icon={Building2} />
                <StatCard label="Live" value={properties.filter((p) => p.approvalStatus === "APPROVED").length} icon={Building2} tone="green" />
                <StatCard label="Waiting review" value={properties.filter((p) => p.approvalStatus === "PENDING").length} icon={Building2} tone="amber" />
              </div>

              {user.role === "OWNER" && (
                <Card title="Property requests & verification" icon={Building2} count={listingRequests.length}>
                  {listingRequests.length === 0 ? (
                    <p className="text-sm text-slate-500">No property requests.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 text-sm">
                      {listingRequests.map((r) => {
                        const l = r.agentListing;
                        const handler = r.acceptedAgent ?? l?.agent ?? null;
                        return (
                          <li key={r.id} className="space-y-1 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-ink">
                                {l ? <Link href={`/listings/${l.slug}`} className="text-brand-600 hover:underline">{l.title}</Link> : "Details not added yet"}
                              </span>
                              <span className="flex items-center gap-2">
                                <Pill tone={r.status === "SUBMITTED" ? "green" : r.status === "CANCELLED" ? "red" : "amber"}>{r.status.replace(/_/g, " ")}</Pill>
                                <Pill tone={r.paidAt ? "green" : "red"}>{r.paidAt ? `Paid ${formatINR(r.amount)}` : "Not paid"}</Pill>
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {r.purpose === "SELL" ? "Sell" : "Rent"} · {r.plan === "GOLD" ? "Pro" : "Basic"} plan · {[r.locality, r.city].filter(Boolean).join(", ")}
                              {l ? ` · ${formatINR(l.price)}` : ""} · requested {dateTime(r.createdAt)}
                            </p>
                            {l && <p className="text-xs text-slate-500">Address: {l.exactAddress}</p>}
                            <p className="text-xs text-slate-500">
                              {handler
                                ? <>Verifying / assigned partner: <b>{handler.user.name}{"agentCode" in handler && handler.agentCode ? ` (${handler.agentCode})` : ""}</b>{handler.user.phone ? ` · ${handler.user.phone}` : ""}</>
                                : r.purpose === "SELL" ? "Handled by the admin team." : `No partner yet · buzzed ${r.buzzCount}× (radius ${r.buzzRadiusKm || 0} km)`}
                            </p>
                            {l && (
                              <p className="text-xs text-slate-500">
                                {l.isDelisted ? "Delisted" : l.listingExpiresAt ? `Live until ${date(l.listingExpiresAt)}` : "Live"} · {l.approvalStatus}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              )}

              <Card title="Listings" icon={Building2} count={user._count.properties}>
                {properties.length === 0 ? (
                  <p className="text-sm text-slate-500">No listings yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {properties.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          <Link href={`/properties/${p.slug}`} className="font-semibold text-brand-600 hover:underline">{p.title}</Link>
                          <span className="ml-2 text-xs text-slate-400">{[p.locality, p.city].filter(Boolean).join(", ")}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{formatINR(p.price)}{p.listingType === "RENT" ? "/mo" : ""}</span>
                          <Pill tone={p.approvalStatus === "APPROVED" ? "green" : p.approvalStatus === "PENDING" ? "amber" : "red"}>{p.approvalStatus}</Pill>
                          <Pill>{p.status}</Pill>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Plans & payments" icon={Banknote} count={user.subscriptions.length}>
                {user.subscriptions.length === 0 ? (
                  <p className="text-sm text-slate-500">On the free plan.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {user.subscriptions.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          <b>{s.plan.name}</b> · {s.amount != null ? formatINR(s.amount) : "—"} · {date(s.startDate)} → {date(s.endDate)}
                        </span>
                        <Pill tone={s.status === "ACTIVE" ? "green" : s.status === "PENDING" ? "amber" : "slate"}>{s.status}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {user.agentProfile && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Wallet" value={formatINR(user.agentProfile.walletBalance)} icon={Wallet} tone="green" />
                <StatCard label="Status" value={user.agentProfile.status} hint={user.agentProfile.primeStatus ? "Prime active" : "No Prime"} icon={IdCard} tone="violet" />
                <StatCard label="Rating" value={user.agentProfile.ratingAvg ? user.agentProfile.ratingAvg.toFixed(1) : "—"} icon={Heart} tone="amber" />
              </div>
              <Card title="Recent commissions" icon={Wallet} count={ledger.length}>
                {ledger.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing credited yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {ledger.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          <b>{l.type.replace(/_/g, " ").toLowerCase()}</b>
                          {l.note && <span className="ml-2 text-slate-500">{l.note}</span>}
                        </span>
                        <span className="flex items-center gap-3">
                          <b className="text-emerald-700">+{formatINR(l.amount)}</b>
                          <span className="text-xs text-slate-400">{date(l.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/admin/partners?tab=commissions&agentId=${user.agentProfile.id}`} className={btnGhost}>Full commission history</Link>
                  <Link href={`/admin/partners?tab=partners&status=ALL&q=${user.agentProfile.agentCode ?? ""}`} className={btnGhost}>Open in partners</Link>
                </div>
              </Card>
            </>
          )}

          {user.investorProfile && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Fee" value={user.investorProfile.feeStatus} hint={formatINR(user.investorProfile.registrationFee)} icon={Banknote} tone="amber" />
                <StatCard label="Invested" value={formatINR(user.investorProfile.totalInvested)} icon={Wallet} tone="green" />
                <StatCard label="Valid until" value={date(user.investorProfile.expiresAt)} icon={CalendarCheck} tone="violet" />
              </div>
              <Card title="Referral partner profile" icon={IdCard}>
                <dl className="divide-y divide-slate-100">
                  <Row k="Referral Partner code" v={user.investorProfile.investorCode ?? "Not issued yet (fee unpaid)"} />
                  <Row
                    k="Registration fee"
                    v={`${formatINR(user.investorProfile.registrationFee)} · ${user.investorProfile.feeStatus === "PAID" ? "Paid" : "Not paid"}${
                      user.investorProfile.feePaymentMode ? ` via ${PAYMENT_MODE_LABELS[user.investorProfile.feePaymentMode]}` : ""
                    }`}
                  />
                  <Row k="Registered on" v={date(user.investorProfile.registeredAt)} />
                  <Row k="Valid until" v={date(user.investorProfile.expiresAt)} />
                  <Row
                    k="Referred by partner"
                    v={
                      <Link href={`/admin/people/${user.investorProfile.referringAgent.user.id}`} className="text-brand-600 hover:underline">
                        {user.investorProfile.referringAgent.user.name} ({user.investorProfile.referringAgent.agentCode ?? "—"})
                        {user.investorProfile.referringAgent.user.phone ? ` · ${user.investorProfile.referringAgent.user.phone}` : ""}
                      </Link>
                    }
                  />
                  <Row k="Active capital" v={formatINR(user.investorProfile.totalInvested)} />
                  <Row k="Profit credited (total)" v={formatINR(investorExtra?.[3]._sum.amount ?? 0)} />
                </dl>
              </Card>

              {investorExtra && (
                <>
                  <Card title="Profit distributions" icon={Banknote} count={investorExtra[0].length}>
                    {investorExtra[0].length === 0 ? (
                      <p className="text-sm text-slate-500">No deal profit has been shared with this partner yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm">
                        {investorExtra[0].map((d) => (
                          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                            <span>
                              Deal profit {formatINR(d.totalProfit)} · partner share <b>{formatINR(d.investorShare)}</b>
                              <span className="block text-xs text-slate-400">via {PAYMENT_MODE_LABELS[d.paymentMode]}{d.note ? ` · ${d.note}` : ""}</span>
                            </span>
                            <span className="text-xs text-slate-400">{date(d.distributedAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card title="Customer agreements" icon={FileText} count={investorExtra[1].length}>
                    {investorExtra[1].length === 0 ? (
                      <p className="text-sm text-slate-500">No customer agreements recorded.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm">
                        {investorExtra[1].map((g) => (
                          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                            <span>
                              <b>{g.customerName}</b> · {g.customerPhone}
                              <span className="block text-xs text-slate-400">
                                {date(g.agreementDate)}
                                {g.flatUnitNumber ? ` · Unit ${g.flatUnitNumber}` : ""}
                                {g.lockInPeriodMonths ? ` · ${g.lockInPeriodMonths} mo lock-in` : ""}
                                {g.paymentAmount ? ` · ${formatINR(g.paymentAmount)}` : ""}
                              </span>
                            </span>
                            <a href={g.signedCopyUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                              <FileText className="h-4 w-4" /> Signed copy
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card title="Document vault" icon={FileText} count={investorExtra[2].length}>
                    {investorExtra[2].length === 0 ? (
                      <p className="text-sm text-slate-500">No documents uploaded.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm">
                        {investorExtra[2].map((v) => (
                          <li key={v.id} className="flex items-center justify-between gap-2 py-2.5">
                            <span>
                              <b>{v.title}</b>
                              <span className="block text-xs text-slate-400">{v.type} · {date(v.createdAt)}</span>
                            </span>
                            <a href={v.url} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                              Open
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </>
              )}
              <Card title="Referral Partner ledger" icon={Wallet} count={investorLedger.length}>
                {investorLedger.length === 0 ? (
                  <p className="text-sm text-slate-500">No profit credited yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {investorLedger.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>{l.note ?? "Profit credit"}</span>
                        <span className="flex items-center gap-3">
                          <b className="text-emerald-700">+{formatINR(l.amount)}</b>
                          <span className="text-xs text-slate-400">{date(l.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {!isBuyer && !isLister && !user.agentProfile && !user.investorProfile && (
            <EmptyState icon={Mail} title="No activity to show" text="This account has no listings, wallet or investments." />
          )}
        </div>
      </div>
    </AdminPage>
  );
}
