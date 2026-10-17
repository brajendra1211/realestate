import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ringProperty, PropertyRingError } from "@/lib/propertyRing";

// Manual "ring the channel partner" action on a saved property — buyer-
// initiated, distinct from the automatic QR-scan nearby-alert. Capped at 2
// per property per rolling 24h (src/lib/propertyRing.ts) so it can't be used
// to spam an agent.
export async function POST(request: Request, context: { params: Promise<{ propertyId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await context.params;

  try {
    const result = await ringProperty(session.user.id, propertyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PropertyRingError) {
      const status = e.message === "dailyLimitReached" ? 429 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}
