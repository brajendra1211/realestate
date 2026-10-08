import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Cleaning up old user records and creating fresh accounts for all panels...");

  const defaultPassword = "Password@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const safeDelete = async (modelName: string) => {
    try {
      if ((prisma as any)[modelName]?.deleteMany) {
        await (prisma as any)[modelName].deleteMany({});
      }
    } catch {}
  };

  await safeDelete("savedProperty");
  await safeDelete("enquiry");
  await safeDelete("leadView");
  await safeDelete("propertyUnlock");
  await safeDelete("dispatchRequest");
  await safeDelete("goldListingPurchase");
  await safeDelete("visitAppointment");
  await safeDelete("directPropertyVisit");
  await safeDelete("platformAntiBypassAgreement");
  await safeDelete("agentShopUnlock");
  await safeDelete("subscription");
  await safeDelete("commissionLedgerEntry");
  await safeDelete("investorLedgerEntry");
  await safeDelete("profitDistribution");
  await safeDelete("customerInvestorAgreement");
  await safeDelete("documentVaultItem");
  await safeDelete("investorProfile");
  await safeDelete("agentProfile");
  await safeDelete("propertyImage");
  await safeDelete("property");
  await safeDelete("user");

  console.log("✅ Old users and old records wiped cleanly.");

  // 3. Create ADMIN Account
  const admin = await prisma.user.create({
    data: {
      email: "admin@noidaprimeproperty.com",
      name: "Noida Prime Admin",
      phone: "+919876543210",
      passwordHash: hashedPassword,
      role: "ADMIN",
      verified: true,
      company: "Noida Prime Properties Pvt Ltd",
    },
  });

  // 4. Create AGENT / CHANNEL PARTNER Account
  const agentUser = await prisma.user.create({
    data: {
      email: "agent@noidaprimeproperty.com",
      name: "Rohit Verma (Prime Partner)",
      phone: "+919876543211",
      passwordHash: hashedPassword,
      role: "AGENT",
      verified: true,
      company: "Verma Real Estate Associates",
    },
  });

  const agentProfile = await prisma.agentProfile.create({
    data: {
      userId: agentUser.id,
      agentCode: "NP-1001",
      city: "Noida",
      shopName: "Verma Realty Hub",
      shopAddress: "Shop 14, Central Market, Sector 50, Noida",
      yearsExperience: 8,
      status: "APPROVED",
      planTier: "PRIME",
      primeStatus: true,
      reraNumber: "UPRERAAGT12890",
    },
  });

  // 5. Create OWNER / DEALER Account
  const owner = await prisma.user.create({
    data: {
      email: "owner@noidaprimeproperty.com",
      name: "Suresh Gupta (Property Owner)",
      phone: "+919876543212",
      passwordHash: hashedPassword,
      role: "OWNER",
      verified: true,
      company: "Gupta Homes",
    },
  });

  // 6. Create BUYER Account
  const buyer = await prisma.user.create({
    data: {
      email: "buyer@noidaprimeproperty.com",
      name: "Ankit Sharma (Verified Buyer)",
      phone: "+919876543213",
      passwordHash: hashedPassword,
      role: "BUYER",
      verified: true,
    },
  });

  // 7. Create INVESTOR Account
  const investorUser = await prisma.user.create({
    data: {
      email: "investor@noidaprimeproperty.com",
      name: "Dr. Vikram Malhotra (Investor)",
      phone: "+919876543214",
      passwordHash: hashedPassword,
      role: "INVESTOR",
      verified: true,
      company: "Malhotra Capital Holdings",
    },
  });

  await prisma.investorProfile.create({
    data: {
      userId: investorUser.id,
      investorCode: "INV-1001",
      referringAgentId: agentProfile.id,
      feeStatus: "PAID",
      totalInvested: 5000000,
    },
  });

  console.log("✅ All 5 Panel accounts created successfully with password: Password@123");

  // 8. Ensure Country & State exist
  const india = await prisma.country.upsert({
    where: { slug: "india" },
    update: {},
    create: { name: "India", slug: "india" },
  });

  const up = await prisma.state.upsert({
    where: { countryId_slug: { countryId: india.id, slug: "uttar-pradesh" } },
    update: {},
    create: { name: "Uttar Pradesh", slug: "uttar-pradesh", countryId: india.id },
  });

  await prisma.city.upsert({
    where: { slug: "noida" },
    update: { published: true },
    create: {
      name: "Noida",
      slug: "noida",
      stateId: up.id,
      published: true,
    },
  });

  await prisma.city.upsert({
    where: { slug: "greater-noida" },
    update: { published: true },
    create: {
      name: "Greater Noida",
      slug: "greater-noida",
      stateId: up.id,
      published: true,
    },
  });

  // 9. Re-seed 5 verified properties attached to the owner
  const properties = [
    {
      title: "Godrej Woods - 3 BHK Luxury Forest-Themed Residence",
      slug: "godrej-woods-3bhk-sector-43-noida",
      description: "Experience urban forest living at Godrej Woods Sector 43, Noida. Featuring 1100+ trees, an infinity-edge pool, private clubhouse, and ultra-luxury modular interiors.",
      price: 24500000,
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      condition: "NEW_BOOKING" as const,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 2088,
      address: "Sector 43, Noida, Uttar Pradesh 201303",
      city: "Noida",
      locality: "Sector 43",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      ownerId: owner.id,
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "ATS Knightsbridge - 4 BHK Ultra Luxury Iconic Penthouse",
      slug: "ats-knightsbridge-4bhk-sector-124-noida",
      description: "Single-residence-per-floor design with 360-degree skyline views, private elevators, and a 35,000 sq ft clubhouse at Sector 124, right on the border of South Delhi and Noida.",
      price: 55000000,
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      condition: "NEW_BOOKING" as const,
      bedrooms: 4,
      bathrooms: 5,
      areaSqft: 6050,
      address: "Sector 124, Noida, Uttar Pradesh 201313",
      city: "Noida",
      locality: "Sector 124",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      ownerId: owner.id,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "Mahagun Manorialle - 3 BHK Golf-Facing Luxury Apartment",
      slug: "mahagun-manorialle-3bhk-sector-128-noida",
      description: "Overlooking an 18-hole championship golf course in Sector 128, offering double-height living rooms, temperature-controlled rooftop pool, and ultra-premium Italian marble finishes.",
      price: 31500000,
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      condition: "RESALE" as const,
      bedrooms: 3,
      bathrooms: 4,
      areaSqft: 2700,
      address: "Wish Town, Sector 128, Noida, Uttar Pradesh 201304",
      city: "Noida",
      locality: "Sector 128",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      ownerId: owner.id,
      images: [
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "Gaur City 2 - 2 BHK Fully Furnished High-Rise Apartment",
      slug: "gaur-city-2-2bhk-rent-greater-noida-west",
      description: "Ready-to-move fully furnished 2 BHK apartment in Gaur City 2, Greater Noida West. Fully equipped modular kitchen, ACs, high-speed elevators, and gated 3-tier security.",
      price: 22000,
      listingType: "RENT" as const,
      propertyType: "APARTMENT" as const,
      condition: "RESALE" as const,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 955,
      address: "Sector 16C, Gaur City 2, Greater Noida West, Uttar Pradesh 201318",
      city: "Greater Noida",
      locality: "Greater Noida West (Noida Extension)",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      ownerId: owner.id,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "Paras Tierea - 3 BHK Premium Semi-Furnished Apartment",
      slug: "paras-tierea-3bhk-rent-sector-137-noida",
      description: "Walking distance to Sector 137 Metro Station, Paras Tierea offers prime connectivity, landscaped central gardens, club facilities, and reserved covered parking.",
      price: 28000,
      listingType: "RENT" as const,
      propertyType: "APARTMENT" as const,
      condition: "RESALE" as const,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1365,
      address: "Sector 137, Noida-Greater Noida Expressway, Noida, Uttar Pradesh 201305",
      city: "Noida",
      locality: "Sector 137",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      ownerId: owner.id,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80",
      ],
    },
  ];

  for (const p of properties) {
    const { images, ...propertyData } = p;
    const created = await prisma.property.create({
      data: propertyData,
    });

    for (let i = 0; i < images.length; i++) {
      await prisma.propertyImage.create({
        data: {
          propertyId: created.id,
          url: images[i],
          order: i,
        },
      });
    }
  }

  console.log("✨ All 5 properties seeded and attached to Owner account.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
