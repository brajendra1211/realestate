import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";

/**
 * GET /api/agent/listings/delisted
 * PDF 1 Page 7 & PDF 2 Page 13:
 * Returns the agent's auto-delisted / expired listings that can be renewed in 1-click.
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) {
    return NextResponse.json({ error: "Channel Partner not found" }, { status: 404 });
  }

  try {
    const delisted = await prisma.agentListing.findMany({
      where: {
        agentId: agent.id,
        isDelisted: true,
      },
      include: {
        images: true,
        masterProperty: true,
      },
      orderBy: { delistedAt: "desc" },
    });

    return NextResponse.json(delisted);
  } catch (error) {
    console.error("Failed to fetch delisted listings", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
