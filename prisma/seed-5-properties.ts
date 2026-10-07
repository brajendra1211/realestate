import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding cities & 5 new Noida properties...");

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
      metaTitle: "Properties in Noida | Buy, Rent & Commercial",
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

  // 3. Find or create an owner user to attach the properties to
  let owner = await prisma.user.findFirst({
    where: { role: { in: ["OWNER", "DEALER", "ADMIN"] }, verified: true },
  });

  if (!owner) {
    owner = await prisma.user.create({
      data: {
        name: "Noida Prime Properties Direct",
        email: "listings@noidaprimeproperty.com",
        phone: "+91 98765 43210",
        role: "OWNER",
        verified: true,
      },
    });
  }

  // 4. 5 Properties: 3 for BUY (SALE) and 2 for RENT (RENT)
  const newProperties = [
    {
      slug: "godrej-woods-luxury-3bhk-sector-43-noida",
      title: "Godrej Woods - Luxury 3 BHK in Sector 43, Noida",
      description:
        "Urban forest themed premium 3 BHK apartment by Godrej Properties with 600+ trees on campus, 3 swimming pools, modular kitchen, and grand private balconies overlooking greenery.",
      listingType: "SALE" as const, // BUY
      propertyType: "APARTMENT" as const,
      price: 24500000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1650,
      city: "Noida",
      locality: "Sector 43",
      address: "Plot 01, Sector 43, Noida, Uttar Pradesh 201303",
      amenities: "Swimming Pool\nGym\nClub House\nChildren's Play Area\n24x7 Security\nPower Backup\nCovered Parking",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
    },
    {
      slug: "ats-knightsbridge-ultra-luxury-4bhk-sector-124-noida",
      title: "ATS Knightsbridge - Ultra Luxury 4 BHK in Sector 124",
      description:
        "Palatial 4 BHK residence in the prestigious ATS Knightsbridge on Noida Expressway. Single apartment per floor layout with panoramic 360-degree views, concierge service, and Olympic size pool.",
      listingType: "SALE" as const, // BUY
      propertyType: "APARTMENT" as const,
      price: 55000000,
      bedrooms: 4,
      bathrooms: 4,
      areaSqft: 3200,
      city: "Noida",
      locality: "Sector 124",
      address: "Sector 124, Noida-Greater Noida Expressway, Noida 201301",
      amenities: "Olympic Swimming Pool\nLuxury Clubhouse\nSpa & Sauna\nPrivate Lift\n24x7 Valet Parking\nHelipad Access",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
    },
    {
      slug: "mahagun-manorialle-3bhk-golf-facing-sector-128-noida",
      title: "Mahagun Manorialle - 3 BHK Golf Facing in Sector 128",
      description:
        "Condo with stunning golf-course views inside Jaypee Wish Town. Features 40-storey architectural marvel with rooftop club, temperature controlled pool, and world class fittings.",
      listingType: "SALE" as const, // BUY
      propertyType: "APARTMENT" as const,
      price: 31500000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1950,
      city: "Noida",
      locality: "Sector 128",
      address: "Jaypee Wish Town, Sector 128, Noida Expressway 201304",
      amenities: "Golf Course View\nInfinity Pool\nModern Gym\nTennis Court\n24x7 Security\nHigh Speed Elevators",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
    },
    {
      slug: "gaur-city-2-2bhk-high-rise-flat-noida-extension",
      title: "Gaur City 2 - 2 BHK High Rise Flat for Rent in Noida Extension",
      description:
        "Semi-furnished 2 BHK apartment in Gaur City 2, Greater Noida West available for rent. Modular kitchen, wardrobes, wooden flooring, close to Gaur City Mall and multi-specialty hospitals.",
      listingType: "RENT" as const, // RENT
      propertyType: "APARTMENT" as const,
      price: 22000, // Monthly Rent
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 980,
      city: "Greater Noida",
      locality: "Noida Extension",
      address: "Gaur City 2, Sector 16C, Greater Noida West 201009",
      amenities: "Clubhouse\nGym\nSwimming Pool\nJogging Track\nCommercial Market\n24x7 Security\nPower Backup",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    },
    {
      slug: "paras-tierea-2bhk-ready-to-move-sector-137-noida",
      title: "Paras Tierea - 2 BHK Ready to Move in Sector 137",
      description:
        "Prime location 2 BHK high-rise apartment directly opposite Sector 137 Metro Station and Advant Navis IT Park available for rent. Ideal for professionals and families seeking convenience and greenery.",
      listingType: "RENT" as const, // RENT
      propertyType: "APARTMENT" as const,
      price: 28000, // Monthly rent
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1150,
      city: "Noida",
      locality: "Sector 137",
      address: "Sector 137, Noida Expressway, Near Felix Hospital 201305",
      amenities: "Metro Adjacent\nGymnasium\nClubhouse\nBadminton Court\n24x7 Security\nVisitor Parking",
      featured: true,
      approvalStatus: "APPROVED" as const,
      status: "AVAILABLE" as const,
      image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200",
    },
  ];

  for (const p of newProperties) {
    const existing = await prisma.property.findUnique({
      where: { slug: p.slug },
    });

    if (existing) {
      // Update listing type and details to ensure 3 Buy + 2 Rent
      await prisma.property.update({
        where: { slug: p.slug },
        data: {
          listingType: p.listingType,
          price: p.price,
          approvalStatus: "APPROVED",
          status: "AVAILABLE",
          featured: true,
        },
      });
      console.log(`Updated property: ${p.title} -> ${p.listingType}`);
      continue;
    }

    const created = await prisma.property.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        listingType: p.listingType,
        propertyType: p.propertyType,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqft: p.areaSqft,
        city: p.city,
        locality: p.locality,
        address: p.address,
        amenities: p.amenities,
        featured: p.featured,
        approvalStatus: p.approvalStatus,
        status: p.status,
        ownerId: owner.id,
        images: {
          create: [
            {
              url: p.image,
              order: 0,
            },
          ],
        },
      },
    });

    console.log(`✅ Created property: ${created.title} (${created.listingType} - ₹${created.price.toLocaleString("en-IN")})`);
  }

  console.log("🎉 All 5 properties seeded successfully (3 Buy / 2 Rent)!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding properties:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
