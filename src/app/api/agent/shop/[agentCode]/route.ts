import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByCode } from "@/lib/agent";
import { isAgentShopUnlocked, AGENT_SHOP_UNLOCK_FEE } from "@/lib/agentShopUnlock";
import { getRazorpayKeyId } from "@/lib/razorpay";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentCode: string }> }
) {
  const { agentCode } = await context.params;
  const agent = await getAgentByCode(agentCode);

  if (!agent || !agent.agentCode) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const session = await auth();
  const buyerId = session?.user?.id;
  const { searchParams } = new URL(request.url);
  const customerPhone = searchParams.get("phone");

  const isUnlocked = await isAgentShopUnlocked(agent.id, buyerId, customerPhone);

  const payload = {
    isUnlocked,
    unlockAmount: AGENT_SHOP_UNLOCK_FEE,
    razorpayKeyId: getRazorpayKeyId(),
    agent: {
      agentCode: agent.agentCode,
      name: agent.user.name,
      shopName: agent.shopName,
      shopAddress: agent.shopAddress,
      city: agent.city,
      phone: isUnlocked ? (agent.user.phone || agent.alternatePhone || "") : (agent.user.phone ? `${agent.user.phone.slice(0, 3)}****${agent.user.phone.slice(-3)}` : ""),
      alternatePhone: isUnlocked ? agent.alternatePhone : null,
      whatsappNumber: isUnlocked ? (agent.user.whatsappNumber || agent.user.phone) : null,
      logoUrl: agent.user.logoUrl,
      primeStatus: agent.primeStatus,
      yearsExperience: agent.yearsExperience,
      staffCount: agent.staffCount,
      reraNumber: agent.reraNumber,
      ratingAvg: agent.ratingAvg,
      ratingCount: agent.ratings.length,
    },
    // When unlocked: return full listings with addresses; when locked: return preview listings with protected addresses
    listings: agent.listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      listingType: l.listingType,
      propertyType: l.propertyType,
      price: l.price,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      areaSqft: l.areaSqft,
      exactAddress: isUnlocked ? l.exactAddress : `${l.masterProperty.locality || "Verified Location"}, ${l.masterProperty.city}`,
      amenities: l.amenities,
      images: l.images.map((img) => ({ id: img.id, url: img.url, order: img.order })),
      masterProperty: {
        city: l.masterProperty.city,
        locality: l.masterProperty.locality,
      },
    })),
  };

  return NextResponse.json(payload);
}
