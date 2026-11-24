import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";

export class CartError extends Error {}

export type CartLine = {
  id: string;
  kind: "property" | "listing";
  refId: string;
  title: string;
  price: number;
  city: string | null;
  slug: string;
  image: string | null;
};

/** Toggle an item in the customer's cart. Returns the new state. */
export async function toggleCartItem(userId: string, ref: { propertyId?: string; agentListingId?: string }) {
  if (ref.propertyId) {
    const existing = await prisma.cartItem.findFirst({ where: { userId, propertyId: ref.propertyId } });
    if (existing) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return { inCart: false };
    }
    await prisma.cartItem.create({ data: { userId, propertyId: ref.propertyId } });
    return { inCart: true };
  }
  if (ref.agentListingId) {
    const existing = await prisma.cartItem.findFirst({ where: { userId, agentListingId: ref.agentListingId } });
    if (existing) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return { inCart: false };
    }
    await prisma.cartItem.create({ data: { userId, agentListingId: ref.agentListingId } });
    return { inCart: true };
  }
  throw new CartError("Choose a property.");
}

export async function getCart(userId: string): Promise<CartLine[]> {
  const items = await prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const propIds = items.map((i) => i.propertyId).filter((x): x is string => !!x);
  const listIds = items.map((i) => i.agentListingId).filter((x): x is string => !!x);
  const [props, listings] = await Promise.all([
    propIds.length
      ? prisma.property.findMany({ where: { id: { in: propIds } }, include: { images: { take: 1, orderBy: { order: "asc" } } } })
      : [],
    listIds.length
      ? prisma.agentListing.findMany({
          where: { id: { in: listIds } },
          include: { images: { take: 1, orderBy: { order: "asc" } }, masterProperty: { select: { city: true } } },
        })
      : [],
  ]);
  const pById = new Map(props.map((p) => [p.id, p]));
  const lById = new Map(listings.map((l) => [l.id, l]));
  const lines: CartLine[] = [];
  for (const i of items) {
    if (i.propertyId) {
      const p = pById.get(i.propertyId);
      if (p) lines.push({ id: i.id, kind: "property", refId: p.id, title: p.title, price: p.price, city: p.city, slug: p.slug, image: p.images[0]?.url ?? null });
    } else if (i.agentListingId) {
      const l = lById.get(i.agentListingId);
      if (l) lines.push({ id: i.id, kind: "listing", refId: l.id, title: l.title, price: l.price, city: l.masterProperty.city, slug: l.slug, image: l.images[0]?.url ?? null });
    }
  }
  return lines;
}

export async function removeCartItem(userId: string, itemId: string) {
  await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
}

/** Snapshot the cart behind a public token (Share Cart) and optionally send it to an agent. */
export async function shareCart(userId: string, opts: { agentCode?: string | null; note?: string | null }) {
  const lines = await getCart(userId);
  if (lines.length === 0) throw new CartError("Your cart is empty.");

  let agentId: string | null = null;
  let agentUser: { id: string; phone: string | null; email: string | null; name: string } | null = null;
  if (opts.agentCode?.trim()) {
    const agent = await prisma.agentProfile.findFirst({
      where: { agentCode: opts.agentCode.trim().toUpperCase() },
      select: { id: true, user: { select: { id: true, phone: true, email: true, name: true } } },
    });
    if (!agent) throw new CartError("No agent found with that code.");
    agentId = agent.id;
    agentUser = agent.user;
  }

  const token = randomBytes(9).toString("base64url");
  const share = await prisma.cartShare.create({
    data: {
      token,
      userId,
      agentId,
      itemsJson: JSON.stringify(lines),
      note: opts.note?.trim() || null,
      sentAt: agentId ? new Date() : null,
    },
  });

  if (agentUser) {
    const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
    const msg = `${buyer?.name ?? "A customer"}${buyer?.phone ? ` (${buyer.phone})` : ""} sent you ${lines.length} propert${lines.length === 1 ? "y" : "ies"} they want. Cart: ${shareUrl(token)}`;
    await notifyUser(agentUser, msg, "Customer cart received");
    await sendPushToUser(agentUser.id, { title: "Customer cart received", body: msg }, { type: "cart_share", token }).catch(() => {});
  }
  return { ...share, url: shareUrl(token), count: lines.length };
}

export function shareUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3002";
  return `${base.replace(/\/$/, "")}/cart/${token}`;
}

export async function getSharedCart(token: string) {
  const share = await prisma.cartShare.findUnique({ where: { token } });
  if (!share) return null;
  return { lines: JSON.parse(share.itemsJson) as CartLine[], note: share.note, createdAt: share.createdAt };
}

export function sharedCartsForAgent(agentId: string) {
  return prisma.cartShare.findMany({ where: { agentId }, orderBy: { createdAt: "desc" }, take: 50 });
}
