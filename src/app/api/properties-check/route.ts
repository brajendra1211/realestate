import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        city: true,
        locality: true,
        listingType: true,
        price: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        areaSqft: true,
        status: true,
        approvalStatus: true,
        featured: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const buyProperties = properties.filter((p) => p.listingType === "SALE");
    const rentProperties = properties.filter((p) => p.listingType === "RENT");
    const noidaProperties = properties.filter(
      (p) => p.city?.toLowerCase().includes("noida") || p.locality?.toLowerCase().includes("noida")
    );

    return NextResponse.json({
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
      counts: {
        totalProperties: properties.length,
        totalBuyForSale: buyProperties.length,
        totalRentForLease: rentProperties.length,
        noidaAndGreaterNoidaTotal: noidaProperties.length,
      },
      noidaPropertiesList: noidaProperties.map((p) => ({
        id: p.id,
        title: p.title,
        listingType: p.listingType === "SALE" ? "BUY (SALE)" : "RENT",
        priceFormatted:
          p.listingType === "RENT"
            ? `₹${p.price.toLocaleString("en-IN")}/month`
            : `₹${(p.price / 10000000 >= 1 ? (p.price / 10000000).toFixed(2) + " Cr" : (p.price / 100000).toFixed(2) + " Lakh")}`,
        city: p.city,
        locality: p.locality,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqft: p.areaSqft,
        status: p.status,
        approvalStatus: p.approvalStatus,
        featured: p.featured,
        viewUrl: `/properties/${p.slug}`,
      })),
      allPropertiesList: properties.map((p) => ({
        id: p.id,
        title: p.title,
        city: p.city,
        locality: p.locality,
        listingType: p.listingType === "SALE" ? "BUY" : "RENT",
        price: p.price,
        status: p.status,
        approvalStatus: p.approvalStatus,
        viewUrl: `/properties/${p.slug}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
