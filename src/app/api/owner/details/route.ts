import { NextResponse } from "next/server";
import { submitOwnerListingAction, type OwnerListingForm } from "@/app/list/[token]/actions";

// Mobile app: the owner's property details (location is mandatory, photos required).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string; form?: OwnerListingForm } | null;
  if (!body?.token || !body.form) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return NextResponse.json(await submitOwnerListingAction(body.token, body.form));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit." }, { status: 400 });
  }
}
