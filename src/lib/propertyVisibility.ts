import type { Prisma } from "@/generated/prisma/client";

/**
 * Properties only show publicly once their lister is verified — admin-owned
 * listings are always visible since admins aren't gated the same way.
 */
export const PUBLIC_LISTER_FILTER: Prisma.UserWhereInput = {
  OR: [{ verified: true }, { role: "ADMIN" }],
};

export function isOwnerPublic(owner: { verified: boolean; role: string }) {
  return owner.verified || owner.role === "ADMIN";
}

export const LISTING_DURATION_DAYS = 30;

export function addListingDuration(from: Date = new Date()) {
  return new Date(from.getTime() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export function isPropertyExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() < Date.now();
}

// Whole days remaining until expiry (negative once past). Encapsulates the
// Date.now() read so call sites (component render bodies) stay free of
// direct impure calls.
export function daysUntil(date: Date | null) {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Listings older than their expiry date stop showing publicly until the
 * lister renews them. Freshly computed each call — must not be hoisted into
 * a module-level constant, since "now" changes per request.
 */
export function notExpiredFilter(): Prisma.PropertyWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}
