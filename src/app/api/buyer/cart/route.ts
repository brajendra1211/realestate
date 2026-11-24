import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CartError, getCart, removeCartItem, toggleCartItem } from "@/lib/cart";

async function buyer() {
  const session = await auth();
  return session && session.user.role === "BUYER" ? session.user : null;
}

export async function GET() {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getCart(u.id));
}

// Toggle: body { propertyId } or { agentListingId }
export async function POST(request: Request) {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(
      await toggleCartItem(u.id, {
        propertyId: body?.propertyId ? String(body.propertyId) : undefined,
        agentListingId: body?.agentListingId ? String(body.agentListingId) : undefined,
      })
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof CartError ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await removeCartItem(u.id, id);
  return NextResponse.json({ ok: true });
}
