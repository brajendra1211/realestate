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
import { formatINR } from "@/lib/format";
import { verifyUser, unverifyUser } from "../../actions";
import { AdminPage, StatCard, Pill, EmptyState, btnGhost, btnSuccess, btnDanger } from "@/components/admin/ui";

type Params = Promise<{ id: string }>;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SUBADMIN: "Sub-admin",
  OWNER: "Owner",
  DEALER: "Dealer",
  BUYER: "Buyer",
  AGENT: "Channel partner",
  INVESTOR: "Referral partner (investor)",
};

const BACK: Record<string, { href: string; label: string }> = {
  OWNER: { href: "/admin/users", label: "Owners & dealers" },
  DEALER: { href: "/admin/users", label: "Owners & dealers" },
  BUYER: { href: "/admin/buyers", label: "Buyers" },
  INVESTOR: { href: "/admin/investors", label: "Investors" },
  AGENT: { href: "/admin/partners", label: "Channel partners" },
  SUBADMIN: { href: "/admin/subadmins", label: "Sub-admins" },
  ADMIN: { href: "/admin", label: "Overview" },
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

export default async function AdminPersonPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      agentProfile: true,
      investorProfile: { include: { referringAgent: { include: { user: { select: { name: true } } } } } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { properties: true, savedProperties: true, enquiries: true, propertyUnlocks: true, dispatchRequests: true, visitAppointments: true, directVisits: true } },
    },
  });
  if (!user) notFound();

  const isBuyer = user.role === "BUYER";
  const isLister = user.role === "OWNER" || user.role === "DEALER" || user.role === "SUBADMIN";

  const [referrer, properties, enquiriesMade, saved, visits, unlocks, dispatches, ledger, investorLedger] = await Promise.all([
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
      ? prisma.propertyUnlock.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { assignedAgent: { select: { agentCode: true } } } })
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
  ]);

  const back = BACK[user.role] ?? BACK.ADMIN;
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
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="blue">{ROLE_LABEL[user.role] ?? user.role}</Pill>
        <Pill tone={user.verified ? "green" : "amber"}>{user.verified ? "Verified" : "Not verified"}</Pill>
        {user.agentProfile && <Pill tone="violet">{user.agentProfile.agentCode ?? "No partner code yet"}</Pill>}
        {user.investorProfile?.investorCode && <Pill tone="violet">{user.investorProfile.investorCode}</Pill>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card title="Contact" icon={Phone}>
            <dl className="divide-y divide-slate-100">
              <Row k="Phone" v={user.phone && <a className="text-brand-600 hover:underline" href={`tel:${user.phone}`}>{user.phone}</a>} />
              <Row k="Alt. phone" v={user.secondaryPhone} />
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

          {hasKyc && (
            <Card title="KYC & bank" icon={IdCard}>
              <dl className="divide-y divide-slate-100">
                <Row k="PAN" v={user.panNumber} />
                <Row k="Aadhaar" v={mask(user.aadhaarNumber)} />
                <Row k="Bank" v={user.bankName} />
                <Row k="Account holder" v={user.bankAccountName} />
                <Row k="Account no." v={mask(user.bankAccountNumber)} />
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
                    {unlocks.map((u) => (
                      <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>
                          {formatINR(u.amount)} · agent share {formatINR(u.agentSplit)}
                          {u.assignedAgent ? ` → ${u.assignedAgent.agentCode}` : " (no agent)"}
                        </span>
                        <span className="text-xs text-slate-400">{dateTime(u.createdAt)}</span>
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
              <Card title="Referral partner details" icon={IdCard}>
                <dl className="divide-y divide-slate-100">
                  <Row k="Investor code" v={user.investorProfile.investorCode} />
                  <Row
                    k="Referred by partner"
                    v={`${user.investorProfile.referringAgent.user.name} (${user.investorProfile.referringAgent.agentCode ?? "—"})`}
                  />
                  <Row k="Registered" v={date(user.investorProfile.registeredAt)} />
                </dl>
              </Card>
              <Card title="Investor ledger" icon={Wallet} count={investorLedger.length}>
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
