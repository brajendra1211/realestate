import { prisma } from "@/lib/prisma";

// One place that answers "did this person actually pay?" for every kind of money
// the platform takes. Each stream lists what was PAID and what is still UNPAID.

export type PayStatus = "PAID" | "UNPAID" | "FREE";

export type PayRow = {
  id: string;
  at: Date;
  userId: string | null;
  who: string;
  contact: string | null;
  amount: number;
  status: PayStatus;
  method: string; // how it was paid, or why it is unpaid
  ref: string | null; // Razorpay payment / order id when we have one
  detail: string | null;
};

export const STREAMS = [
  { key: "partner", label: "Channel partner plans", hint: "Basic / Prime membership" },
  { key: "referral", label: "Referral partner fee", hint: "Yearly registration fee" },
  { key: "owner", label: "Owner & dealer plans", hint: "Listing plans bought from the dashboard" },
  { key: "requests", label: "Owner requests", hint: "Plans bought on the list-property page" },
  { key: "unlock", label: "Buyer unlocks", hint: "Pay to reveal a listing's contact" },
  { key: "dispatch", label: "Buzzer / dispatch", hint: "Pay to alert nearby partners" },
  { key: "gold", label: "Gold listings", hint: "Customer self-listings" },
  { key: "shop", label: "Shop access", hint: "Pay to open a partner's shop" },
  { key: "brochure", label: "Brochure recharge", hint: "Credit packs bought by partners" },
] as const;
export type StreamKey = (typeof STREAMS)[number]["key"];

const LIMIT = 400;
const razorpay = (id: string | null | undefined) => (id ? "Razorpay" : null);

type U = { id: string; name: string; phone: string | null; email: string | null } | null | undefined;
const who = (u: U, fallback = "Unknown") => u?.name ?? fallback;
const contact = (u: U) => u?.phone ?? u?.email ?? null;

export async function getPaymentTracker(opts: { userId?: string } = {}): Promise<Record<StreamKey, PayRow[]>> {
  const uid = opts.userId;
  const byUser = uid ? { userId: uid } : {};
  const byBuyer = uid ? { buyerId: uid } : {};
  const userSel = { select: { id: true, name: true, phone: true, email: true, role: true } } as const;

  const [
    subs,
    unpaidAgents,
    investors,
    pendingSubs,
    requests,
    unlocks,
    dispatches,
    golds,
    shops,
    brochures,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: { amount: { gt: 0 }, status: { not: "PENDING" }, ...byUser },
      include: { user: userSel, plan: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.agentProfile.findMany({
      where: { agentCode: null, ...byUser },
      include: { user: userSel },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.investorProfile.findMany({
      where: { ...byUser },
      include: { user: userSel },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.subscription.findMany({
      where: { status: "PENDING", ...byUser },
      include: { user: userSel, plan: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.listingRequest.findMany({ where: { ...byUser }, orderBy: { createdAt: "desc" }, take: LIMIT }),
    prisma.propertyUnlock.findMany({
      where: { ...byBuyer },
      include: { buyer: userSel, agentListing: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.dispatchRequest.findMany({
      where: { amount: { gt: 0 }, ...byBuyer },
      include: { buyer: userSel },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.goldListingPurchase.findMany({
      where: { ...byBuyer },
      include: { buyer: userSel, agentListing: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.agentShopUnlock.findMany({
      where: { ...byBuyer },
      include: { buyer: userSel, agent: { select: { agentCode: true, shopName: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.brochureRecharge.findMany({
      where: uid ? { agent: { userId: uid } } : {},
      include: { agent: { select: { agentCode: true, user: userSel } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
  ]);

  const partnerPlanPrice = (await prisma.plan.findFirst({ where: { id: "plan-agent-basic" } }))?.price ?? 1000;
  const agentIds = new Set(subs.filter((s) => s.user.role === "AGENT").map((s) => s.userId));

  const out: Record<StreamKey, PayRow[]> = {
    partner: [],
    referral: [],
    owner: [],
    requests: [],
    unlock: [],
    dispatch: [],
    gold: [],
    shop: [],
    brochure: [],
  };

  // --- channel partner plans ---
  for (const s of subs.filter((x) => x.user.role === "AGENT")) {
    out.partner.push({
      id: s.id,
      at: s.createdAt,
      userId: s.userId,
      who: who(s.user),
      contact: contact(s.user),
      amount: s.amount ?? 0,
      status: "PAID",
      method: razorpay(s.razorpayPaymentId) ?? "Admin / wallet",
      ref: s.razorpayPaymentId,
      detail: s.plan.name,
    });
  }
  for (const a of unpaidAgents) {
    if (agentIds.has(a.userId)) continue; // paid at some point but no code yet: skip
    out.partner.push({
      id: `unpaid-${a.id}`,
      at: a.createdAt,
      userId: a.userId,
      who: who(a.user),
      contact: contact(a.user),
      amount: partnerPlanPrice,
      status: "UNPAID",
      method: a.status === "PENDING" ? "Registered, plan not paid" : a.status === "REJECTED" ? "Rejected" : "Verified, plan not paid",
      ref: null,
      detail: a.shopName,
    });
  }

  // --- referral partner fee ---
  for (const i of investors) {
    const paid = i.feeStatus === "PAID";
    out.referral.push({
      id: i.id,
      at: paid ? i.registeredAt : i.createdAt,
      userId: i.userId,
      who: who(i.user),
      contact: contact(i.user),
      amount: i.registrationFee,
      status: paid ? "PAID" : "UNPAID",
      method: paid ? (i.feePaymentMode ? i.feePaymentMode.replace("_", " ") : "Confirmed") : "Fee pending",
      ref: i.investorCode,
      detail: i.investorCode ? `Code ${i.investorCode}` : null,
    });
  }

  // --- owner & dealer plans ---
  for (const s of subs.filter((x) => x.user.role !== "AGENT")) {
    out.owner.push({
      id: s.id,
      at: s.createdAt,
      userId: s.userId,
      who: who(s.user),
      contact: contact(s.user),
      amount: s.amount ?? 0,
      status: "PAID",
      method: razorpay(s.razorpayPaymentId) ?? "Admin assigned",
      ref: s.razorpayPaymentId,
      detail: s.plan.name,
    });
  }
  for (const s of pendingSubs) {
    out.owner.push({
      id: s.id,
      at: s.createdAt,
      userId: s.userId,
      who: who(s.user),
      contact: contact(s.user),
      amount: s.amount ?? 0,
      status: "UNPAID",
      method: "Requested, not paid",
      ref: null,
      detail: s.plan.name,
    });
  }

  // --- owner requests (list-property page) ---
  for (const r of requests) {
    const paid = r.status !== "PENDING_PAYMENT";
    out.requests.push({
      id: r.id,
      at: r.paidAt ?? r.createdAt,
      userId: r.userId,
      who: r.ownerName,
      contact: r.ownerPhone,
      amount: r.amount,
      status: paid ? "PAID" : "UNPAID",
      method: paid ? razorpay(r.razorpayOrderId) ?? "Confirmed" : "Awaiting payment",
      ref: r.razorpayOrderId,
      detail: `${r.plan} plan · ${r.city}`,
    });
  }

  // --- buyer unlocks ---
  for (const u of unlocks) {
    out.unlock.push({
      id: u.id,
      at: u.createdAt,
      userId: u.buyerId,
      who: who(u.buyer),
      contact: contact(u.buyer),
      amount: u.amount,
      status: "PAID",
      method: "Online",
      ref: null,
      detail: u.agentListing?.title ?? null,
    });
  }

  // --- buzzer / dispatch ---
  for (const d of dispatches) {
    out.dispatch.push({
      id: d.id,
      at: d.createdAt,
      userId: d.buyerId,
      who: who(d.buyer),
      contact: contact(d.buyer),
      amount: d.amount,
      status: "PAID",
      method: razorpay(d.razorpayOrderId) ?? "Online",
      ref: d.razorpayOrderId,
      detail: `${d.purpose ?? "RENT"} · ${d.status}`,
    });
  }

  // --- gold listings ---
  for (const g of golds) {
    out.gold.push({
      id: g.id,
      at: g.createdAt,
      userId: g.buyerId,
      who: who(g.buyer),
      contact: contact(g.buyer),
      amount: g.amount,
      status: "PAID",
      method: razorpay(g.razorpayOrderId) ?? "Online",
      ref: g.razorpayOrderId,
      detail: g.agentListing?.title ?? null,
    });
  }

  // --- shop access ---
  for (const s of shops) {
    out.shop.push({
      id: s.id,
      at: s.createdAt,
      userId: s.buyerId,
      who: s.buyer ? who(s.buyer) : s.customerPhone ? `Guest ${s.customerPhone}` : "Guest",
      contact: s.buyer ? contact(s.buyer) : s.customerPhone,
      amount: s.amount,
      status: "PAID",
      method: razorpay(s.razorpayPaymentId) ?? "Online",
      ref: s.razorpayPaymentId,
      detail: s.agent.shopName ?? s.agent.agentCode,
    });
  }

  // --- brochure recharge ---
  for (const b of brochures) {
    const admin = b.source === "ADMIN";
    out.brochure.push({
      id: b.id,
      at: b.createdAt,
      userId: b.agent.user?.id ?? null,
      who: who(b.agent.user),
      contact: contact(b.agent.user),
      amount: b.amount,
      status: admin ? "FREE" : "PAID",
      method: admin ? "Admin credit (no payment)" : razorpay(b.razorpayPaymentId) ?? "Online",
      ref: b.razorpayPaymentId,
      detail: `${b.credits} credits`,
    });
  }

  for (const key of Object.keys(out) as StreamKey[]) {
    out[key].sort((a, b) => b.at.getTime() - a.at.getTime());
  }
  return out;
}

export function summarize(rows: PayRow[]) {
  let paid = 0;
  let paidAmount = 0;
  let unpaid = 0;
  let unpaidAmount = 0;
  for (const r of rows) {
    if (r.status === "PAID") {
      paid++;
      paidAmount += r.amount;
    } else if (r.status === "UNPAID") {
      unpaid++;
      unpaidAmount += r.amount;
    }
  }
  return { paid, paidAmount, unpaid, unpaidAmount, total: rows.length };
}
