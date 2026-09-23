import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@bayaestate.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "BayaEstate Admin";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      verified: true,
    },
  });
  console.log(`Admin ready: ${admin.email}`);

  const dealer = await prisma.user.upsert({
    where: { email: "dealer@bayaestate.com" },
    update: {},
    create: {
      name: "Demo Dealer",
      email: "dealer@bayaestate.com",
      phone: "+91 90000 00000",
      company: "BayaEstate Realty",
      slug: "bayaestate-realty",
      about:
        "BayaEstate Realty is a trusted property dealer in Bengaluru helping buyers, sellers, and tenants find the right home.",
      passwordHash: await hashPassword("Dealer123!"),
      role: "DEALER",
      verified: true,
    },
  });
  console.log(`Demo dealer ready: ${dealer.email}`);

  const owner = await prisma.user.upsert({
    where: { email: "owner@bayaestate.com" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "owner@bayaestate.com",
      phone: "+91 90000 00001",
      slug: "demo-owner",
      about: "Independent homeowner listing properties directly, without a broker.",
      passwordHash: await hashPassword("Owner123!"),
      role: "OWNER",
      verified: true,
    },
  });
  console.log(`Demo owner ready: ${owner.email}`);

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@bayaestate.com" },
    update: {},
    create: {
      name: "Demo Agent",
      email: "agent@bayaestate.com",
      phone: "+91 90000 00002",
      slug: "demo-agent-realty",
      passwordHash: await hashPassword("Agent123!"),
      role: "AGENT",
    },
  });

  const agentProfile = await prisma.agentProfile.upsert({
    where: { userId: agentUser.id },
    update: {},
    create: {
      userId: agentUser.id,
      agentCode: "AGT-BLR-1000",
      city: "Bengaluru",
      shopName: "Demo Agent Realty",
      shopAddress: "123 MG Road, Bengaluru",
      yearsExperience: 5,
      staffCount: 2,
      reraNumber: "RERA-DEMO-001",
      status: "APPROVED",
      primeStatus: true,
      verifiedAt: new Date(),
    },
  });
  console.log(`Demo agent ready: ${agentUser.email} (${agentProfile.agentCode})`);

  const investorUser = await prisma.user.upsert({
    where: { email: "investor@bayaestate.com" },
    update: {},
    create: {
      name: "Demo Investor",
      email: "investor@bayaestate.com",
      phone: "+91 90000 00003",
      slug: "demo-investor",
      passwordHash: await hashPassword("Investor123!"),
      role: "INVESTOR",
    },
  });

  const investorProfile = await prisma.investorProfile.upsert({
    where: { userId: investorUser.id },
    update: {},
    create: {
      userId: investorUser.id,
      investorCode: "INV-000001",
      referringAgentId: agentProfile.id,
      feeStatus: "PAID",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      totalInvested: 1000000,
    },
  });
  console.log(`Demo investor ready: ${investorUser.email} (${investorProfile.investorCode})`);

  const existingReferral = await prisma.commissionLedgerEntry.findFirst({
    where: { agentId: agentProfile.id, refId: investorProfile.id, type: "REGISTRATION_REFERRAL" },
  });
  if (!existingReferral) {
    await prisma.commissionLedgerEntry.create({
      data: {
        agentId: agentProfile.id,
        type: "REGISTRATION_REFERRAL",
        amount: 2000,
        refId: investorProfile.id,
        note: `10% referral for investor ${investorProfile.investorCode} registration fee`,
      },
    });
    await prisma.agentProfile.update({
      where: { id: agentProfile.id },
      data: { walletBalance: { increment: 2000 } },
    });
  }
  console.log(`Demo commission ledger entry ready for ${agentProfile.agentCode}`);

  const masterProperty = await prisma.masterProperty.upsert({
    where: { masterId: "PROP-BLR-2026-1000" },
    update: {},
    create: {
      masterId: "PROP-BLR-2026-1000",
      city: "Bengaluru",
      locality: "Whitefield",
      latitude: 12.9698,
      longitude: 77.75,
    },
  });

  const agentListing = await prisma.agentListing.upsert({
    where: { slug: "3bhk-apartment-whitefield-demo" },
    update: {},
    create: {
      slug: "3bhk-apartment-whitefield-demo",
      masterPropertyId: masterProperty.id,
      agentId: agentProfile.id,
      title: "3BHK Apartment in Whitefield",
      description:
        "Spacious 3BHK with a clubhouse, swimming pool, and covered parking. Close to tech parks and schools.",
      listingType: "SALE",
      propertyType: "APARTMENT",
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1450,
      price: 9200000,
      exactAddress: "Flat 402, Prestige Shantiniketan, ITPL Main Road, Whitefield, Bengaluru",
      amenities: "Swimming Pool, Gym, Club House, Car Parking",
    },
  });
  console.log(`Demo agent listing ready: ${agentListing.slug} (${masterProperty.masterId})`);

  const developer = await prisma.developer.upsert({
    where: { slug: "prestige-group" },
    update: {},
    create: {
      slug: "prestige-group",
      name: "Prestige Group",
      about:
        "Prestige Group is a leading real estate developer known for premium residential and commercial projects across Bengaluru.",
      website: "https://example.com",
      city: "Bengaluru",
      verified: true,
      metaTitle: "Prestige Group Projects in Bengaluru",
      metaDescription:
        "Explore residential and commercial projects by Prestige Group in Bengaluru — prices, floor plans, and possession dates.",
    },
  });
  console.log(`Demo developer ready: ${developer.name}`);

  const project = await prisma.project.upsert({
    where: { slug: "prestige-lakeside-habitat" },
    update: {},
    create: {
      slug: "prestige-lakeside-habitat",
      name: "Prestige Lakeside Habitat",
      description:
        "A premium gated community with lakeside views, offering 2, 3, and 4 BHK apartments with world-class amenities.",
      status: "UNDER_CONSTRUCTION",
      developerId: developer.id,
      city: "Bengaluru",
      locality: "Varthur",
      priceMin: 9500000,
      priceMax: 25000000,
      amenities: "Clubhouse, Swimming pool, Gym, Landscaped gardens, 24x7 security",
      metaTitle: "Prestige Lakeside Habitat, Varthur, Bengaluru",
      metaDescription:
        "Prestige Lakeside Habitat in Varthur, Bengaluru — 2/3/4 BHK apartments starting ₹95 Lakh. Check price, amenities, and possession date.",
    },
  });
  console.log(`Demo project ready: ${project.name}`);

  const india = await prisma.country.upsert({
    where: { slug: "india" },
    update: {},
    create: { name: "India", slug: "india" },
  });

  const karnataka = await prisma.state.upsert({
    where: { countryId_slug: { countryId: india.id, slug: "karnataka" } },
    update: {},
    create: { name: "Karnataka", slug: "karnataka", countryId: india.id },
  });

  const bengaluru = await prisma.city.upsert({
    where: { slug: "bengaluru" },
    update: {},
    create: {
      name: "Bengaluru",
      slug: "bengaluru",
      stateId: karnataka.id,
      latitude: 12.9716,
      longitude: 77.5946,
      metaTitle: "Property for Sale & Rent in Bengaluru",
      metaDescription:
        "Browse verified properties for sale and rent in Bengaluru — apartments, villas, plots, and commercial spaces from trusted dealers and owners.",
      description:
        "Bengaluru, India's tech capital, offers a wide range of residential and commercial properties across neighborhoods like Whitefield, Sarjapur, and MG Road.",
    },
  });

  const whitefield = await prisma.locality.upsert({
    where: { cityId_slug: { cityId: bengaluru.id, slug: "whitefield" } },
    update: {},
    create: {
      name: "Whitefield",
      slug: "whitefield",
      cityId: bengaluru.id,
      latitude: 12.9698,
      longitude: 77.75,
      metaTitle: "Property for Sale & Rent in Whitefield, Bengaluru",
      metaDescription:
        "Find apartments, villas, and plots for sale or rent in Whitefield, Bengaluru — close to IT parks, schools, and malls.",
      description:
        "Whitefield is one of Bengaluru's most sought-after residential and IT hubs, home to major tech parks and premium housing.",
    },
  });

  await prisma.locality.upsert({
    where: { cityId_slug: { cityId: bengaluru.id, slug: "sarjapur" } },
    update: {},
    create: {
      name: "Sarjapur",
      slug: "sarjapur",
      cityId: bengaluru.id,
      latitude: 12.8994,
      longitude: 77.7864,
    },
  });

  console.log(`Geo hierarchy ready: ${india.name} > ${karnataka.name} > ${bengaluru.name} > ${whitefield.name}`);

  const basicAmenities = [
    "Swimming Pool",
    "Gym",
    "Club House",
    "Children's Play Area",
    "Landscaped Garden",
    "24x7 Security",
    "CCTV Surveillance",
    "Power Backup",
    "Car Parking",
    "Lift",
    "Piped Gas",
    "Rain Water Harvesting",
    "Indoor Games Room",
    "Jogging Track",
    "Amphitheatre",
    "Multipurpose Hall",
    "Intercom Facility",
    "Fire Safety",
    "Visitor Parking",
    "Water Supply 24x7",
  ];

  for (const [index, name] of basicAmenities.entries()) {
    await prisma.amenity.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), order: index },
    });
  }
  console.log(`${basicAmenities.length} amenities ready`);

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "BayaEstate",
      tagline: "Find your next home, fast.",
      heroTitle: "Find the right property, faster",
      heroSubtitle: "Buy, sell, and rent homes with verified dealers and owners across the city.",
      contactEmail: adminEmail,
    },
  });

  const sampleProperties = [
    {
      title: "3BHK Modern Apartment in Whitefield",
      city: "Bengaluru",
      locality: "Whitefield",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      price: 8500000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1450,
      description:
        "Spacious 3BHK apartment with modern amenities, close to tech parks and schools.",
    },
    {
      title: "Cozy 2BHK for Rent near MG Road",
      city: "Bengaluru",
      locality: "MG Road",
      listingType: "RENT" as const,
      propertyType: "APARTMENT" as const,
      price: 35000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 950,
      description: "Well-maintained 2BHK, walking distance to metro and cafes.",
    },
    {
      title: "Independent Villa with Garden in Sarjapur",
      city: "Bengaluru",
      locality: "Sarjapur",
      listingType: "SALE" as const,
      propertyType: "VILLA" as const,
      price: 21000000,
      bedrooms: 4,
      bathrooms: 4,
      areaSqft: 3200,
      description: "Gated community villa with private garden and clubhouse access.",
    },
  ];

  for (const property of sampleProperties) {
    const slug = slugify(property.title);
    await prisma.property.upsert({
      where: { slug },
      update: {
        ownerId: dealer.id,
        contactName: dealer.name,
        contactPhone: dealer.phone,
        contactEmail: dealer.email,
      },
      create: {
        ...property,
        slug,
        ownerId: dealer.id,
        approvalStatus: "APPROVED",
        featured: true,
        contactName: dealer.name,
        contactPhone: dealer.phone,
        contactEmail: dealer.email,
      },
    });
  }
  console.log(`${sampleProperties.length} sample properties ready`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
