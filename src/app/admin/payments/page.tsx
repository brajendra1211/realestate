import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";

type SearchParams = Promise<{
  tab?: string;
  q?: string;
}>;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { tab = "all", q = "" } = await searchParams;
  const searchQuery = q.trim().toLowerCase();

  // Fetch all payment-related records concurrently
  const [
    payouts,
    propertyUnlocks,
    shopUnlocks,
    goldPurchases,
    commissionEntries,
  ] = await Promise.all([
    prisma.payoutRequest.findMany({
      include: {
        agent: {
          include: {
            user: { select: { name: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.propertyUnlock.findMany({
      include: {
        buyer: { select: { name: true, phone: true, email: true } },
        agentListing: { select: { id: true, title: true, slug: true } },
        assignedAgent: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentShopUnlock.findMany({
      include: {
        agent: {
          include: { user: { select: { name: true, phone: true } } },
        },
        buyer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goldListingPurchase.findMany({
      include: {
        buyer: { select: { name: true, phone: true } },
        agentListing: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commissionLedgerEntry.findMany({
      include: {
        agent: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  // Aggregate metrics
  const totalPayoutsPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.netAmount, 0);

  const totalPayoutsPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.netAmount, 0);

  const totalPropertyUnlockRev = propertyUnlocks.reduce(
    (sum, u) => sum + u.amount,
    0
  );

  const totalShopUnlockRev = shopUnlocks.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  const totalGoldPurchaseRev = goldPurchases.reduce(
    (sum, g) => sum + g.amount,
    0
  );

  const totalPlatformRevenue =
    totalPropertyUnlockRev + totalShopUnlockRev + totalGoldPurchaseRev;

  const totalCommissionCredited = commissionEntries.reduce(
    (sum, c) => sum + c.amount,
    0
  );

  // Unified timeline items for "All Transactions"
  type TimelineItem = {
    id: string;
    type: "PAYOUT" | "PROPERTY_UNLOCK" | "SHOP_UNLOCK" | "GOLD_LISTING" | "COMMISSION";
    title: string;
    description: string;
    amount: number;
    isCredit: boolean; // green vs neutral
    statusBadge: string;
    statusColor: string;
    partyName: string;
    partyPhone?: string | null;
    date: Date;
    refId?: string | null;
  };

  const timelineItems: TimelineItem[] = [
    ...payouts.map((p) => ({
      id: `payout-${p.id}`,
      type: "PAYOUT" as const,
      title: `Channel Partner Payout (${p.status})`,
      description: `Gross ${formatINR(p.grossAmount)} · TDS (₹${p.tdsAmount}) · Net ${formatINR(p.netAmount)}`,
      amount: p.netAmount,
      isCredit: false,
      statusBadge: p.status,
      statusColor:
        p.status === "PAID"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : p.status === "REJECTED"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
      partyName: p.agent.user.name,
      partyPhone: p.agent.user.phone,
      date: p.requestedAt,
      refId: p.paymentMode ? `Mode: ${p.paymentMode}` : null,
    })),
    ...propertyUnlocks.map((u) => ({
      id: `unlock-${u.id}`,
      type: "PROPERTY_UNLOCK" as const,
      title: "Property Unlock Fee",
      description: `Listing: ${u.agentListing.title} (Agent split: ${formatINR(u.agentSplit)}, Company split: ${formatINR(u.companySplit)})`,
      amount: u.amount,
      isCredit: true,
      statusBadge: "SUCCESS",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      partyName: u.buyer.name || "Customer",
      partyPhone: u.buyer.phone,
      date: u.createdAt,
      refId: u.assignedAgent ? `Partner: ${u.assignedAgent.user.name}` : null,
    })),
    ...shopUnlocks.map((s) => ({
      id: `shop-${s.id}`,
      type: "SHOP_UNLOCK" as const,
      title: "QR Shop Unlock Fee",
      description: `Customer scanned partner QR code for verified shop & listings`,
      amount: s.amount,
      isCredit: true,
      statusBadge: "SUCCESS",
      statusColor: "bg-purple-50 text-purple-700 border-purple-200",
      partyName: s.customerPhone || s.buyer?.name || "Customer",
      partyPhone: s.customerPhone,
      date: s.createdAt,
      refId: `Partner: ${s.agent.user.name}`,
    })),
    ...goldPurchases.map((g) => ({
      id: `gold-${g.id}`,
      type: "GOLD_LISTING" as const,
      title: "Gold Direct Listing Fee",
      description: `Listing: ${g.agentListing.title}`,
      amount: g.amount,
      isCredit: true,
      statusBadge: "SUCCESS",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200",
      partyName: g.buyer.name || "Owner",
      partyPhone: g.buyer.phone,
      date: g.createdAt,
    })),
    ...commissionEntries.map((c) => ({
      id: `comm-${c.id}`,
      type: "COMMISSION" as const,
      title: `Commission: ${c.type.replace(/_/g, " ")}`,
      description: c.note || "Commission credited to partner wallet",
      amount: c.amount,
      isCredit: true,
      statusBadge: "CREDITED",
      statusColor: "bg-teal-50 text-teal-700 border-teal-200",
      partyName: c.agent.user.name,
      partyPhone: c.agent.user.phone,
      date: c.createdAt,
      refId: c.refId,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Search filter
  const filteredTimeline = timelineItems.filter((item) => {
    if (tab === "payouts" && item.type !== "PAYOUT") return false;
    if (tab === "property_unlocks" && item.type !== "PROPERTY_UNLOCK") return false;
    if (tab === "shop_unlocks" && item.type !== "SHOP_UNLOCK") return false;
    if (tab === "gold" && item.type !== "GOLD_LISTING") return false;
    if (tab === "commissions" && item.type !== "COMMISSION") return false;

    if (!searchQuery) return true;
    return (
      item.partyName.toLowerCase().includes(searchQuery) ||
      (item.partyPhone && item.partyPhone.includes(searchQuery)) ||
      item.title.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery)
    );
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payments & Transaction History
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Real-time audit log of all financial transactions: Channel partner payouts, customer property unlocks, QR shop unlocks, and commissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/payouts"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Manage Pending Payouts ({payouts.filter((p) => p.status === "PENDING").length}) →
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Payouts Disbursed
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm">
              ₹
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {formatINR(totalPayoutsPaid)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Pending approval:</span>
            <span className="font-semibold text-amber-600">
              {formatINR(totalPayoutsPending)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unlock Fees Collected
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-sm">
              🔓
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {formatINR(totalPropertyUnlockRev + totalShopUnlockRev)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{propertyUnlocks.length} listing + {shopUnlocks.length} shop unlocks</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Platform Revenue
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 font-bold text-sm">
              💼
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-purple-950">
            {formatINR(totalPlatformRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Incl. ₹{totalGoldPurchaseRev} Gold direct listings</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Commissions Credited
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 font-bold text-sm">
              🤝
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {formatINR(totalCommissionCredited)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>To verified channel partners</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: `All (${timelineItems.length})` },
            { key: "payouts", label: `Agent Payouts (${payouts.length})` },
            { key: "property_unlocks", label: `Property Unlocks (${propertyUnlocks.length})` },
            { key: "shop_unlocks", label: `QR Shop Unlocks (${shopUnlocks.length})` },
            { key: "gold", label: `Gold Listings (${goldPurchases.length})` },
            { key: "commissions", label: `Commissions (${commissionEntries.length})` },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={`/admin/payments?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Search Input */}
        <form method="GET" action="/admin/payments" className="relative w-full sm:w-64">
          <input type="hidden" name="tab" value={tab} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search party, phone, title…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 pr-8 text-xs focus:border-blue-500 focus:outline-none"
          />
          {q && (
            <Link
              href={`/admin/payments?tab=${tab}`}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </Link>
          )}
        </form>
      </div>

      {/* Transactions Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredTimeline.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No transactions found</p>
            <p className="mt-1 text-xs text-slate-400">
              {q ? "Try clearing your search query" : "No records in this category yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transaction / Type</th>
                  <th className="py-3 px-4">Party Details</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTimeline.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            item.type === "PAYOUT"
                              ? "bg-rose-50 text-rose-600"
                              : item.type === "PROPERTY_UNLOCK"
                              ? "bg-blue-50 text-blue-600"
                              : item.type === "SHOP_UNLOCK"
                              ? "bg-purple-50 text-purple-600"
                              : item.type === "GOLD_LISTING"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-teal-50 text-teal-600"
                          }`}
                        >
                          {item.type === "PAYOUT"
                            ? "💸"
                            : item.type === "PROPERTY_UNLOCK"
                            ? "🔓"
                            : item.type === "SHOP_UNLOCK"
                            ? "📱"
                            : item.type === "GOLD_LISTING"
                            ? "⭐"
                            : "💰"}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {item.type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{item.partyName}</p>
                      {item.partyPhone && (
                        <p className="text-slate-400 font-mono text-[11px]">{item.partyPhone}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-600 truncate">{item.description}</p>
                      {item.refId && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.refId}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${item.statusColor}`}
                      >
                        {item.statusBadge}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-black text-sm ${
                          item.type === "PAYOUT" ? "text-slate-900" : "text-emerald-700"
                        }`}
                      >
                        {item.type === "PAYOUT" ? "–" : "+"}
                        {formatINR(item.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                      <div>{item.date.toLocaleDateString("en-IN")}</div>
                      <div className="text-[10px]">
                        {item.date.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
