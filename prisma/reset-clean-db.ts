import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Clearing old database records (properties, images, enquiries, saved)...");

  // Delete dependent property records
  await prisma.savedProperty.deleteMany({});
  await prisma.enquiry.deleteMany({});
  await prisma.propertyImage.deleteMany({});
  await prisma.property.deleteMany({});

  console.log("✅ All old property records cleared.");

  // 1. Ensure Country & State exist
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

  // 2. Ensure Noida & Greater Noida cities exist in DB
  await prisma.city.upsert({
    where: { slug: "noida" },
    update: { published: true },
    create: {
      name: "Noida",
      slug: "noida",
      stateId: up.id,
      latitude: 28.5355,
      longitude: 77.3910,
      published: true,
      metaTitle: "Properties in Noida | Luxury Buy, Rent & Commercial",
      metaDescription: "Explore verified residential and commercial properties in Noida with top amenities.",
    },
  });

  await prisma.city.upsert({
    where: { slug: "greater-noida" },
    update: { published: true },
    create: {
      name: "Greater Noida",
      slug: "greater-noida",
      stateId: up.id,
      latitude: 28.4744,
      longitude: 77.5040,
      published: true,
      metaTitle: "Properties in Greater Noida | Buy & Rent",
      metaDescription: "Find prime properties in Greater Noida and Noida Extension.",
    },
  });

  // 3. Ensure Admin user exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@noidaprimeproperty.com";
  const hashedPassword = await bcrypt.hash("Admin@12345", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", verified: true },
    create: {
      email: adminEmail,
      name: "Noida Prime Admin",
      phone: "+919876543210",
      passwordHash: hashedPassword,
      role: "ADMIN",
      verified: true,
    },
  });

  // 4. Ensure Site Settings exist with Noida branding
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      siteName: "Noida Prime Properties",
      tagline: "Your Premier Real Estate Portal in Noida & NCR",
      metaTitle: "Noida Prime Properties | Buy, Rent & Invest in Noida Real Estate",
      metaDescription: "Discover luxury apartments, villas, and commercial spaces across prime sectors of Noida and Greater Noida.",
    },
    create: {
      id: "default",
      siteName: "Noida Prime Properties",
      tagline: "Your Premier Real Estate Portal in Noida & NCR",
      metaTitle: "Noida Prime Properties | Buy, Rent & Invest in Noida Real Estate",
      metaDescription: "Discover luxury apartments, villas, and commercial spaces across prime sectors of Noida and Greater Noida.",
      contactEmail: "info@noidaprimeproperty.com",
      contactPhone: "+91 98765 43210",
      contactAddress: "Sector 62, Noida, Uttar Pradesh 201309",
    },
  });

  // 5. Seed 5 Clean, Verified, High-End Properties (3 Buy, 2 Rent)
  const properties = [
    // --- 3 BUY (SALE) PROPERTIES ---
    {
      title: "Godrej Woods - 3 BHK Luxury Forest-Themed Residence",
      slug: "godrej-woods-3bhk-sector-43-noida",
      description: "Experience urban forest living at Godrej Woods Sector 43, Noida. Featuring 1100+ trees, an infinity-edge pool, private clubhouse, and ultra-luxury modular interiors just minutes from Noida-Greater Noida Expressway.",
      price: 24500000, // ₹2.45 Cr
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
      ownerId: adminUser.id,
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "ATS Knightsbridge - 4 BHK Ultra Luxury Iconic Penthouse",
      slug: "ats-knightsbridge-4bhk-sector-124-noida",
      description: "The pinnacle of elite luxury at Sector 124, right on the border of South Delhi and Noida. Single-residence-per-floor design, 360-degree skyline views, private elevators, and a 35,000 sq ft clubhouse.",
      price: 55000000, // ₹5.50 Cr
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
      ownerId: adminUser.id,
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "Mahagun Manorialle - 3 BHK Golf-Facing Luxury Apartment",
      slug: "mahagun-manorialle-3bhk-sector-128-noida",
      description: "Overlooking an 18-hole championship golf course in Sector 128, Mahagun Manorialle offers double-height living rooms, temperature-controlled rooftop pool, and ultra-premium Italian marble finishes.",
      price: 31500000, // ₹3.15 Cr
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
      ownerId: adminUser.id,
      images: [
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      ],
    },

    // --- 2 RENT (RENTAL) PROPERTIES ---
    {
      title: "Gaur City 2 - 2 BHK Fully Furnished High-Rise Apartment",
      slug: "gaur-city-2-2bhk-rent-greater-noida-west",
      description: "Ready-to-move fully furnished 2 BHK apartment in Gaur City 2, Greater Noida West. Fully equipped modular kitchen, ACs, high-speed elevators, gated 3-tier security, and adjacent shopping mall.",
      price: 22000, // ₹22,000 / month
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
      ownerId: adminUser.id,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80",
      ],
    },
    {
      title: "Paras Tierea - 3 BHK Premium Semi-Furnished Apartment",
      slug: "paras-tierea-3bhk-rent-sector-137-noida",
      description: "Walking distance to Sector 137 Metro Station, Paras Tierea offers prime connectivity, landscaped central gardens, club facilities, reserved covered parking, and 24x7 power backup.",
      price: 28000, // ₹28,000 / month
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
      ownerId: adminUser.id,
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

  const finalCount = await prisma.property.count();
  console.log(`✨ Database reset & clean seed completed! Total verified properties: ${finalCount}`);
  console.log("👉 3 Buy (SALE) and 2 Rent (RENT) properties live.");
}

main()
  .catch((e) => {
    console.error("❌ Reset script error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
