"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CartError, removeCartItem, shareCart, toggleCartItem } from "@/lib/cart";
import { cancelWatch } from "@/lib/watchlist";

async function requireBuyerId() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") redirect("/buyer/login");
  return session.user.id;
}

export async function toggleCartAction(formData: FormData) {
  const userId = await requireBuyerId();
  const propertyId = String(formData.get("propertyId") ?? "");
  const agentListingId = String(formData.get("agentListingId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/buyer/cart");
  await toggleCartItem(userId, {
    propertyId: propertyId || undefined,
    agentListingId: agentListingId || undefined,
  }).catch(() => {});
  revalidatePath(redirectTo.split("?")[0]);
  revalidatePath("/buyer/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const userId = await requireBuyerId();
  await removeCartItem(userId, String(formData.get("id") ?? ""));
  revalidatePath("/buyer/cart");
}

// Share Cart: create the public link and show it on the cart page.
export async function shareCartAction() {
  const userId = await requireBuyerId();
  let url: string;
  try {
    url = (await shareCart(userId, {})).url;
  } catch (e) {
    redirect(`/buyer/cart?error=${encodeURIComponent(e instanceof CartError ? e.message : "Could not share the cart.")}`);
  }
  redirect(`/buyer/cart?link=${encodeURIComponent(url)}`);
}

// Send to Agent: snapshot the cart to the chosen agent code.
export async function sendCartToAgentAction(formData: FormData) {
  const userId = await requireBuyerId();
  try {
    await shareCart(userId, {
      agentCode: String(formData.get("agentCode") ?? ""),
      note: String(formData.get("note") ?? ""),
    });
  } catch (e) {
    redirect(`/buyer/cart?error=${encodeURIComponent(e instanceof CartError ? e.message : "Could not send the cart.")}`);
  }
  redirect("/buyer/cart?sent=1");
}

export async function cancelWatchAction(formData: FormData) {
  const userId = await requireBuyerId();
  await cancelWatch(userId, String(formData.get("id") ?? ""));
  revalidatePath("/buyer/cart");
}
