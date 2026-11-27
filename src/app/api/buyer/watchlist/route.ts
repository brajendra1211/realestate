import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelWatch, createWatchRequirement, listWatchForBuyer, WatchError } from "@/lib/watchlist";

async function buyer() {
  const session = await auth();
  return session && session.user.role === "BUYER" ? session.user : null;
}

export async function GET() {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listWatchForBuyer(u.id));
}

export async function POST(request: Request) {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const num = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));
  try {
    const w = await createWatchRequirement({
      buyerId: u.id,
      purpose: b.purpose,
      bhk: num(b.bhk),
      budgetMin: num(b.budgetMin),
      budgetMax: num(b.budgetMax),
      societyName: b.societyName ?? null,
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
      radiusKm: num(b.radiusKm) ?? 5,
    });
    return NextResponse.json(w);
  } catch (e) {
    return NextResponse.json({ error: e instanceof WatchError ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const u = await buyer();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await cancelWatch(u.id, new URL(request.url).searchParams.get("id") ?? "");
  return NextResponse.json({ ok: true });
}
