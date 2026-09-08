import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting Massive & Complete Dummy Data Seeding...");

  // 1. Passwords
  const defaultPass = await hashPassword("ChangeMe123!");
  const dealerPass = await hashPassword("Dealer123!");
  const ownerPass = await hashPassword("Owner123!");
  const agentPass = await hashPassword("Agent123!");
  const investorPass = await hashPassword("Investor123!");
  const buyerPass = await hashPassword("Buyer123!");

  // 2. Subscription Plans
  console.log("1/15 Seeding Subscription Plans...");
  const agentBasicPlan = await prisma.plan.upsert({
    where: { id: "plan-agent-basic" },
    update: {},
    create: {
      id: "plan-agent-basic",
      name: "Agent Basic Plan",
      role: "AGENT",
      listingLimit: 10,
      leadLimit: null,
      price: 1000,
      durationDays: 30,
      active: true,
    },
  });

  const agentPrimePlan = await prisma.plan.upsert({
    where: { id: "plan-agent-prime" },
    update: {},
    create: {
      id: "plan-agent-prime",
      name: "Agent Prime Plan",
      role: "AGENT",
      listingLimit: 50,
      leadLimit: null,
      price: 2000,
      durationDays: 30,
      active: true,
    },
  });

  const ownerStarterPlan = await prisma.plan.upsert({
    where: { id: "plan-owner-starter" },
    update: {},
    create: {
      id: "plan-owner-starter",
      name: "Owner Free Starter",
      role: "OWNER",
      listingLimit: 3,
      leadLimit: 15,
      price: 0,
      durationDays: 90,
      active: true,
    },
  });

  const dealerProPlan = await prisma.plan.upsert({
    where: { id: "plan-dealer-pro" },
    update: {},
    create: {
      id: "plan-dealer-pro",
      name: "Dealer Growth Pro",
      role: "DEALER",
      listingLimit: 30,
      leadLimit: 150,
      price: 2999,
      durationDays: 30,
      active: true,
    },
  });

  const dealerEnterprisePlan = await prisma.plan.upsert({
    where: { id: "plan-dealer-enterprise" },
    update: {},
    create: {
      id: "plan-dealer-enterprise",
      name: "Dealer Enterprise Unlimited",
      role: "DEALER",
      listingLimit: 100,
      leadLimit: 500,
      price: 6999,
      durationDays: 30,
      active: true,
    },
  });

  // 3. Geo Locations
  console.log("2/15 Seeding Geo Hierarchy...");
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
      heroImage: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200",
      metaTitle: "Properties for Sale & Rent in Bengaluru",
      metaDescription: "Find verified residential & commercial properties across Bengaluru.",
      description: "Bengaluru, India's tech capital, offers premium housing, tech parks, and thriving commercial hubs.",
      published: true,
    },
  });

  const localitiesData = [
    { name: "Whitefield", slug: "whitefield", lat: 12.9698, lng: 77.75 },
    { name: "Sarjapur", slug: "sarjapur", lat: 12.8994, lng: 77.7864 },
    { name: "Indiranagar", slug: "indiranagar", lat: 12.9784, lng: 77.6408 },
    { name: "Koramangala", slug: "koramangala", lat: 12.9352, lng: 77.6245 },
    { name: "HSR Layout", slug: "hsr-layout", lat: 12.9121, lng: 77.6446 },
    { name: "MG Road", slug: "mg-road", lat: 12.9756, lng: 77.6066 },
    { name: "Electronic City", slug: "electronic-city", lat: 12.8452, lng: 77.6602 },
    { name: "Hebbal", slug: "hebbal", lat: 13.0358, lng: 77.597 },
    { name: "Yelahanka", slug: "yelahanka", lat: 13.1007, lng: 77.5963 },
    { name: "BTM Layout", slug: "btm-layout", lat: 12.9166, lng: 77.6101 },
  ];

  for (const loc of localitiesData) {
    await prisma.locality.upsert({
      where: { cityId_slug: { cityId: bengaluru.id, slug: loc.slug } },
      update: {},
      create: {
        name: loc.name,
        slug: loc.slug,
        cityId: bengaluru.id,
        latitude: loc.lat,
        longitude: loc.lng,
        published: true,
      },
    });
  }

  // 4. Developers & Projects
  console.log("3/15 Seeding Developers & Projects...");
  const prestige = await prisma.developer.upsert({
    where: { slug: "prestige-group" },
    update: {},
    create: {
      slug: "prestige-group",
      name: "Prestige Group",
      about: "Leading real estate developer with over 250+ luxury projects across India.",
      website: "https://prestigeconstructions.com",
      city: "Bengaluru",
      verified: true,
    },
  });

  const sobha = await prisma.developer.upsert({
    where: { slug: "sobha-limited" },
    update: {},
    create: {
      slug: "sobha-limited",
      name: "Sobha Limited",
      about: "Pioneers in high-quality construction with German tech precision.",
      website: "https://sobha.com",
      city: "Bengaluru",
      verified: true,
    },
  });

  const brigade = await prisma.developer.upsert({
    where: { slug: "brigade-group" },
    update: {},
    create: {
      slug: "brigade-group",
      name: "Brigade Group",
      about: "Top-tier developer of smart integrated townships and office parks.",
      website: "https://brigadegroup.com",
      city: "Bengaluru",
      verified: true,
    },
  });

  const godrej = await prisma.developer.upsert({
    where: { slug: "godrej-properties" },
    update: {},
    create: {
      slug: "godrej-properties",
      name: "Godrej Properties",
      about: "Award-winning developer combining 125-year legacy of innovation with cutting-edge design.",
      website: "https://godrejproperties.com",
      city: "Bengaluru",
      verified: true,
    },
  });

  const projectPrestige = await prisma.project.upsert({
    where: { slug: "prestige-lakeside-habitat" },
    update: {},
    create: {
      slug: "prestige-lakeside-habitat",
      name: "Prestige Lakeside Habitat",
      description: "Disney-themed luxury township overlooking the scenic Varthur Lake.",
      status: "READY_TO_MOVE",
      developerId: prestige.id,
      city: "Bengaluru",
      locality: "Whitefield",
      priceMin: 9500000,
      priceMax: 30000000,
      amenities: "Clubhouse, Infinity Pool, Gym, Tennis Court, Landscaped Parks",
      reraNumber: "PRM/KA/RERA/1251/310/PR/170915/000176",
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200", order: 0 },
        ],
      },
    },
  });

  const projectSobha = await prisma.project.upsert({
    where: { slug: "sobha-dream-acres" },
    update: {},
    create: {
      slug: "sobha-dream-acres",
      name: "Sobha Dream Acres",
      description: "Massive 81-acre smart residential community with precast tech.",
      status: "READY_TO_MOVE",
      developerId: sobha.id,
      city: "Bengaluru",
      locality: "Sarjapur",
      priceMin: 7200000,
      priceMax: 14500000,
      amenities: "5 Clubhouses, 5 Swimming Pools, 80% Open Greenery",
      reraNumber: "PRM/KA/RERA/1251/308/PR/170918/000622",
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200", order: 0 },
        ],
      },
    },
  });

  const projectBrigade = await prisma.project.upsert({
    where: { slug: "brigade-cornerstone-utopia" },
    update: {},
    create: {
      slug: "brigade-cornerstone-utopia",
      name: "Brigade Cornerstone Utopia",
      description: "47-acre extraordinary smart township with residential, retail, and office spaces.",
      status: "UNDER_CONSTRUCTION",
      developerId: brigade.id,
      city: "Bengaluru",
      locality: "Whitefield",
      priceMin: 6800000,
      priceMax: 19500000,
      amenities: "High Street Retail, Cineplex, Multiplex, Amphitheatre, Solar Backup",
      reraNumber: "PRM/KA/RERA/1251/308/PR/181122/002176",
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200", order: 0 },
        ],
      },
    },
  });

  const projectGodrej = await prisma.project.upsert({
    where: { slug: "godrej-woodscapes" },
    update: {},
    create: {
      slug: "godrej-woodscapes",
      name: "Godrej Woodscapes",
      description: "Forest-themed ultra-luxury high-rise apartments amidst 1500+ trees.",
      status: "UPCOMING",
      developerId: godrej.id,
      city: "Bengaluru",
      locality: "Budigere Cross",
      priceMin: 12000000,
      priceMax: 28000000,
      amenities: "Forest Walkways, Treehouses, Organic Farm, Heated Pool",
      reraNumber: "PRM/KA/RERA/1251/308/PR/240315/006789",
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200", order: 0 },
        ],
      },
    },
  });

  // 5. Users & Profiles
  console.log("4/15 Seeding Accounts & Profiles...");

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "BayaEstate Admin",
      email: "admin@bayaestate.com",
      passwordHash: defaultPass,
      role: "ADMIN",
      verified: true,
    },
  });

  // Subadmin
  const subadmin = await prisma.user.upsert({
    where: { email: "subadmin@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Neha Operations (Subadmin)",
      email: "subadmin@bayaestate.com",
      passwordHash: defaultPass,
      role: "SUBADMIN",
      verified: true,
    },
  });

  // Dealer 1 (Approved & Verified)
  const dealer = await prisma.user.upsert({
    where: { email: "dealer@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Demo Dealer",
      email: "dealer@bayaestate.com",
      phone: "+91 90000 00000",
      company: "BayaEstate Realty",
      slug: "bayaestate-realty",
      about: "Leading RERA-registered real estate brokerage across Bengaluru East & South.",
      passwordHash: dealerPass,
      role: "DEALER",
      verified: true,
    },
  });

  // Dealer 2 (Pending Admin Verification)
  const dealerPending = await prisma.user.upsert({
    where: { email: "dealer2@bayaestate.com" },
    update: {},
    create: {
      name: "Amit Roy (Apex Spaces)",
      email: "dealer2@bayaestate.com",
      phone: "+91 91111 22222",
      company: "Apex Prime Commercial Realty",
      slug: "apex-prime-realty",
      about: "Specialists in IT park office leasing and commercial retail space.",
      passwordHash: dealerPass,
      role: "DEALER",
      verified: false,
    },
  });

  // Owner 1 (Approved & Verified)
  const owner = await prisma.user.upsert({
    where: { email: "owner@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Ramesh Gupta (Demo Owner)",
      email: "owner@bayaestate.com",
      phone: "+91 90000 00001",
      slug: "demo-owner",
      about: "Direct individual homeowner listing verified properties with zero brokerage.",
      passwordHash: ownerPass,
      role: "OWNER",
      verified: true,
    },
  });

  // Owner 2 (Pending Admin Verification)
  const ownerPending = await prisma.user.upsert({
    where: { email: "owner2@bayaestate.com" },
    update: {},
    create: {
      name: "Suresh Patel",
      email: "owner2@bayaestate.com",
      phone: "+91 93333 44444",
      slug: "suresh-patel",
      about: "NRI property owner listing high-end duplex villas and apartments.",
      passwordHash: ownerPass,
      role: "OWNER",
      verified: false,
    },
  });

  // Subscriptions
  await prisma.subscription.upsert({
    where: { id: "sub-dealer-active" },
    update: {},
    create: {
      id: "sub-dealer-active",
      userId: dealer.id,
      planId: dealerProPlan.id,
      status: "ACTIVE",
      amount: 2999,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.subscription.upsert({
    where: { id: "sub-owner-active" },
    update: {},
    create: {
      id: "sub-owner-active",
      userId: owner.id,
      planId: ownerStarterPlan.id,
      status: "ACTIVE",
      amount: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // Agent 1: Demo Agent (Approved & Prime)
  const agentUser1 = await prisma.user.upsert({
    where: { email: "agent@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Karan Joshi (Demo Agent)",
      email: "agent@bayaestate.com",
      phone: "+91 90000 00002",
      slug: "demo-agent-karan",
      passwordHash: agentPass,
      role: "AGENT",
      verified: true,
    },
  });

  const agentProfile1 = await prisma.agentProfile.upsert({
    where: { userId: agentUser1.id },
    update: {
      primeStatus: true,
      status: "APPROVED",
      walletBalance: 42500,
      ratingAvg: 4.9,
    },
    create: {
      userId: agentUser1.id,
      agentCode: "AGT-BLR-1000",
      city: "Bengaluru",
      shopName: "Karan Realty Solutions",
      shopAddress: "123 Outer Ring Road, Marathahalli, Bengaluru",
      shopLatitude: 12.9569,
      shopLongitude: 77.7011,
      yearsExperience: 8,
      staffCount: 4,
      reraNumber: "RERA-BLR-AGT-2024-001",
      status: "APPROVED",
      primeStatus: true,
      walletBalance: 42500,
      ratingAvg: 4.9,
      verifiedAt: new Date(),
    },
  });

  // Agent 2: Rajesh Sharma (Approved & Prime)
  const agentUser2 = await prisma.user.upsert({
    where: { email: "agent2@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Rajesh Sharma",
      email: "agent2@bayaestate.com",
      phone: "+91 98888 77771",
      slug: "rajesh-sharma-agent",
      passwordHash: agentPass,
      role: "AGENT",
      verified: true,
    },
  });

  const agentProfile2 = await prisma.agentProfile.upsert({
    where: { userId: agentUser2.id },
    update: {
      primeStatus: true,
      status: "APPROVED",
      walletBalance: 24000,
      ratingAvg: 4.7,
    },
    create: {
      userId: agentUser2.id,
      agentCode: "AGT-BLR-1001",
      city: "Bengaluru",
      shopName: "Sharma & Sons Real Estate",
      shopAddress: "45 100ft Road, Indiranagar, Bengaluru",
      shopLatitude: 12.9784,
      shopLongitude: 77.6408,
      yearsExperience: 10,
      staffCount: 5,
      reraNumber: "RERA-BLR-AGT-2023-089",
      status: "APPROVED",
      primeStatus: true,
      walletBalance: 24000,
      ratingAvg: 4.7,
      verifiedAt: new Date(),
    },
  });

  // Agent 3: Vikram Malhotra (Pending Admin Approval)
  const agentUser3 = await prisma.user.upsert({
    where: { email: "agent3@bayaestate.com" },
    update: {},
    create: {
      name: "Vikram Malhotra",
      email: "agent3@bayaestate.com",
      phone: "+91 97777 66662",
      slug: "vikram-malhotra",
      passwordHash: agentPass,
      role: "AGENT",
      verified: false,
    },
  });

  const agentProfile3 = await prisma.agentProfile.upsert({
    where: { userId: agentUser3.id },
    update: {},
    create: {
      userId: agentUser3.id,
      agentCode: "AGT-BLR-1002",
      city: "Bengaluru",
      shopName: "Malhotra Estates",
      shopAddress: "78 80ft Road, Koramangala 4th Block, Bengaluru",
      yearsExperience: 4,
      staffCount: 2,
      reraNumber: "RERA-BLR-AGT-2025-112",
      status: "PENDING",
      primeStatus: false,
      walletBalance: 0,
    },
  });

  // Agent KYC Documents
  await prisma.agentDocument.createMany({
    data: [
      {
        agentProfileId: agentProfile1.id,
        type: "RERA_CERTIFICATE",
        url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
      },
      {
        agentProfileId: agentProfile1.id,
        type: "TRADE_LICENSE",
        url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
      },
      {
        agentProfileId: agentProfile1.id,
        type: "GST_CERTIFICATE",
        url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
      },
      {
        agentProfileId: agentProfile3.id,
        type: "RERA_CERTIFICATE",
        url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
      },
    ],
    skipDuplicates: true,
  });

  // Area Agent Assignments
  await prisma.areaAgentAssignment.createMany({
    data: [
      { pincode: "560066", agentId: agentProfile1.id },
      { pincode: "560038", agentId: agentProfile1.id },
      { pincode: "560034", agentId: agentProfile2.id },
      { pincode: "560095", agentId: agentProfile1.id },
      { pincode: "560100", agentId: agentProfile2.id },
    ],
    skipDuplicates: true,
  });

  // Investors
  // Investor 1: Sanjay Agarwal (Active & Paid)
  const investorUser1 = await prisma.user.upsert({
    where: { email: "investor@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Sanjay Agarwal (Demo Investor)",
      email: "investor@bayaestate.com",
      phone: "+91 90000 00003",
      slug: "demo-investor",
      passwordHash: investorPass,
      role: "INVESTOR",
      verified: true,
    },
  });

  const investorProfile1 = await prisma.investorProfile.upsert({
    where: { userId: investorUser1.id },
    update: {
      feeStatus: "PAID",
      totalInvested: 2500000,
    },
    create: {
      userId: investorUser1.id,
      investorCode: "INV-000001",
      referringAgentId: agentProfile1.id,
      feeStatus: "PAID",
      registrationFee: 20000,
      feePaymentMode: "BANK_TRANSFER",
      expiresAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      totalInvested: 2500000,
    },
  });

  // Investor 2: Kavita Singhania (Expiring in 18 days -> triggers Admin Alert)
  const investorUser2 = await prisma.user.upsert({
    where: { email: "investor2@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Kavita Singhania",
      email: "investor2@bayaestate.com",
      phone: "+91 99999 11112",
      slug: "kavita-singhania",
      passwordHash: investorPass,
      role: "INVESTOR",
      verified: true,
    },
  });

  const investorProfile2 = await prisma.investorProfile.upsert({
    where: { userId: investorUser2.id },
    update: {
      feeStatus: "PAID",
      expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId: investorUser2.id,
      investorCode: "INV-000002",
      referringAgentId: agentProfile1.id,
      feeStatus: "PAID",
      registrationFee: 20000,
      feePaymentMode: "UPI",
      expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      totalInvested: 5000000,
    },
  });

  // Investor 3: Deepak Bansal (Pending Approval)
  const investorUser3 = await prisma.user.upsert({
    where: { email: "investor3@bayaestate.com" },
    update: {},
    create: {
      name: "Deepak Bansal",
      email: "investor3@bayaestate.com",
      phone: "+91 98888 33334",
      slug: "deepak-bansal",
      passwordHash: investorPass,
      role: "INVESTOR",
      verified: false,
    },
  });

  await prisma.investorProfile.upsert({
    where: { userId: investorUser3.id },
    update: {},
    create: {
      userId: investorUser3.id,
      referringAgentId: agentProfile2.id,
      feeStatus: "PENDING",
      registrationFee: 20000,
      totalInvested: 0,
    },
  });

  // Buyers
  const buyerUser1 = await prisma.user.upsert({
    where: { email: "testbuyer@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Rahul Verma (Demo Buyer)",
      email: "testbuyer@bayaestate.com",
      phone: "+91 98765 43210",
      passwordHash: buyerPass,
      role: "BUYER",
      verified: true,
    },
  });

  const buyerUser2 = await prisma.user.upsert({
    where: { email: "buyer2@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Priya Nair",
      email: "buyer2@bayaestate.com",
      phone: "+91 98765 43211",
      passwordHash: buyerPass,
      role: "BUYER",
      verified: true,
    },
  });

  const buyerUser3 = await prisma.user.upsert({
    where: { email: "buyer3@bayaestate.com" },
    update: { verified: true },
    create: {
      name: "Anand Deshmukh",
      email: "buyer3@bayaestate.com",
      phone: "+91 98765 43212",
      passwordHash: buyerPass,
      role: "BUYER",
      verified: true,
    },
  });

  // 6. Master Properties & Agent Listings
  console.log("5/15 Seeding Master Properties & Agent Listings...");

  const master1 = await prisma.masterProperty.upsert({
    where: { masterId: "PROP-BLR-2026-1001" },
    update: {},
    create: {
      masterId: "PROP-BLR-2026-1001",
      city: "Bengaluru",
      locality: "Whitefield",
      latitude: 12.9698,
      longitude: 77.75,
    },
  });

  const master2 = await prisma.masterProperty.upsert({
    where: { masterId: "PROP-BLR-2026-1002" },
    update: {},
    create: {
      masterId: "PROP-BLR-2026-1002",
      city: "Bengaluru",
      locality: "Indiranagar",
      latitude: 12.9784,
      longitude: 77.6408,
    },
  });

  const master3 = await prisma.masterProperty.upsert({
    where: { masterId: "PROP-BLR-2026-1003" },
    update: {},
    create: {
      masterId: "PROP-BLR-2026-1003",
      city: "Bengaluru",
      locality: "Koramangala",
      latitude: 12.9352,
      longitude: 77.6245,
    },
  });

  const master4 = await prisma.masterProperty.upsert({
    where: { masterId: "PROP-BLR-2026-1004" },
    update: {},
    create: {
      masterId: "PROP-BLR-2026-1004",
      city: "Bengaluru",
      locality: "Sarjapur",
      latitude: 12.8994,
      longitude: 77.7864,
    },
  });

  const agentListing1 = await prisma.agentListing.upsert({
    where: { slug: "3bhk-lake-view-prestige-whitefield" },
    update: {},
    create: {
      slug: "3bhk-lake-view-prestige-whitefield",
      masterPropertyId: master1.id,
      agentId: agentProfile1.id,
      source: "AGENT",
      approvalStatus: "APPROVED",
      title: "Luxury 3BHK Lake View Apartment in Whitefield",
      description: "Corner unit on 14th floor overlooking green foliage. High-end Italian marble, modular kitchen, two covered parking spots.",
      listingType: "SALE",
      propertyType: "APARTMENT",
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1850,
      price: 13500000,
      exactAddress: "Tower 5, Flat 1402, Prestige Lakeside Habitat, Varthur Main Road, Whitefield, Bengaluru",
      amenities: "Swimming Pool, Gymnasium, Club House, 24x7 Security, Power Backup, Lift",
      nearbyAmenities: "Hope Farm Metro (1.5km), Manipal Hospital (3km), Forum Shantiniketan Mall (4km)",
      listingPlan: "GOLD",
      listingFee: 500,
      listingExpiresAt: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200", order: 0 },
          { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200", order: 1 },
        ],
      },
    },
  });

  const agentListing2 = await prisma.agentListing.upsert({
    where: { slug: "4bhk-luxury-penthouse-indiranagar" },
    update: {},
    create: {
      slug: "4bhk-luxury-penthouse-indiranagar",
      masterPropertyId: master2.id,
      agentId: agentProfile1.id,
      source: "AGENT",
      approvalStatus: "APPROVED",
      title: "Exclusive 4BHK Duplex Penthouse in Indiranagar",
      description: "Rare luxury penthouse with private terrace garden, plunge pool, and skyline views. Walking distance from 12th Main cafes.",
      listingType: "SALE",
      propertyType: "APARTMENT",
      bedrooms: 4,
      bathrooms: 5,
      areaSqft: 3400,
      price: 42000000,
      exactAddress: "Penthouse B, Skyline Heights, 6th Cross, 100ft Road, Indiranagar, Bengaluru",
      amenities: "Private Terrace, Plunge Pool, Lift with biometric lock, 24x7 Security, Power Backup",
      nearbyAmenities: "Indiranagar Metro (800m), Chinmaya Mission Hospital (1.2km)",
      listingPlan: "GOLD",
      listingFee: 500,
      listingExpiresAt: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200", order: 0 },
        ],
      },
    },
  });

  const agentListingPendingGold = await prisma.agentListing.upsert({
    where: { slug: "urgent-3bhk-resale-koramangala-gold" },
    update: {},
    create: {
      slug: "urgent-3bhk-resale-koramangala-gold",
      masterPropertyId: master3.id,
      agentId: agentProfile1.id,
      source: "CUSTOMER_GOLD",
      approvalStatus: "PENDING",
      title: "Direct Owner Pre-Market 3BHK in Koramangala 3rd Block",
      description: "Owner relocating. Fully furnished flat in gated apartment with covered car park. Clear titles.",
      listingType: "SALE",
      propertyType: "APARTMENT",
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1650,
      price: 18500000,
      exactAddress: "Flat 204, Greenview Residency, 8th Main, Koramangala 3rd Block, Bengaluru",
      amenities: "Security, Lift, Power Backup, Gym",
      listingPlan: "GOLD",
      listingFee: 500,
    },
  });

  const agentListingApprovedGold = await prisma.agentListing.upsert({
    where: { slug: "exclusive-off-market-villa-sarjapur" },
    update: {},
    create: {
      slug: "exclusive-off-market-villa-sarjapur",
      masterPropertyId: master4.id,
      agentId: agentProfile2.id,
      source: "CUSTOMER_GOLD",
      approvalStatus: "APPROVED",
      title: "Off-Market Gated Community Villa in Sarjapur Road",
      description: "Distress sale opportunity for verified Prime agents and pre-approved investors. 4BHK triplex villa with private backyard.",
      listingType: "SALE",
      propertyType: "VILLA",
      bedrooms: 4,
      bathrooms: 4,
      areaSqft: 2900,
      price: 24000000,
      exactAddress: "Villa 32, Whispering Palms, Sarjapur Main Road, Bengaluru",
      amenities: "Clubhouse, Swimming Pool, Tennis Court, Solar Backup",
      listingPlan: "GOLD",
      listingFee: 500,
    },
  });

  // 7. Public Properties (Owner & Dealer Listings)
  console.log("6/15 Seeding Public & Lister Properties...");

  const propertiesList = [
    {
      title: "Sobha 3BHK Luxury Residence with Sunlit Balcony",
      slug: "sobha-3bhk-luxury-residence-panathur",
      description: "Stunning 3BHK in Sobha Dream Acres. Facing central gardens with large balcony, modular kitchen, and covered car parking.",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      price: 11500000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1550,
      city: "Bengaluru",
      locality: "Whitefield",
      address: "Tower 12, Sobha Dream Acres, Balagere-Panathur Road, Bengaluru",
      amenities: "Swimming Pool, Gymnasium, Clubhouse, Tennis Court, 24x7 Security",
      ownerId: dealer.id,
      approvalStatus: "APPROVED" as const,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
    },
    {
      title: "Designer 4BHK Triplex Villa with Private Pool",
      slug: "designer-4bhk-triplex-villa-sarjapur",
      description: "Architect-designed luxury villa in gated enclave. Private lawn, rooftop pool, and home theatre lounge.",
      listingType: "SALE" as const,
      propertyType: "VILLA" as const,
      price: 28000000,
      bedrooms: 4,
      bathrooms: 5,
      areaSqft: 3600,
      city: "Bengaluru",
      locality: "Sarjapur",
      address: "Villa 18, Silver Springs Enclave, Sarjapur Road, Bengaluru",
      amenities: "Private Swimming Pool, Club House, 24x7 Security, Power Backup",
      ownerId: dealer.id,
      approvalStatus: "APPROVED" as const,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200",
    },
    {
      title: "Cozy Furnished 2BHK Apartment for Rent near Metro",
      slug: "cozy-furnished-2bhk-rent-indiranagar",
      description: "Fully furnished 2BHK flat behind 100ft road. Walking distance to Indiranagar Metro Station and cafes.",
      listingType: "RENT" as const,
      propertyType: "APARTMENT" as const,
      price: 45000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1100,
      city: "Bengaluru",
      locality: "Indiranagar",
      address: "2nd Floor, Sai Nilayam, 12th Main, Indiranagar, Bengaluru",
      amenities: "Power Backup, Lift, Covered Car Parking, 24x7 Water Supply",
      ownerId: owner.id,
      approvalStatus: "APPROVED" as const,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    },
    {
      title: "Prime Commercial Showroom & Office Space on Main Road",
      slug: "prime-commercial-space-hsr-layout",
      description: "High footfall commercial frontage on 27th Main HSR Layout. Ideal for banks, retail stores, or clinics.",
      listingType: "RENT" as const,
      propertyType: "COMMERCIAL" as const,
      price: 160000,
      bedrooms: 0,
      bathrooms: 2,
      areaSqft: 2200,
      city: "Bengaluru",
      locality: "HSR Layout",
      address: "Ground Floor, 27th Main Road, Sector 1, HSR Layout, Bengaluru",
      amenities: "Lift, 100% Power Backup, Roadside Parking, Fire Safety",
      ownerId: dealer.id,
      approvalStatus: "APPROVED" as const,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
    },
    {
      title: "BDA Approved 2400 Sqft Residential Villa Plot",
      slug: "bda-approved-villa-plot-electronic-city",
      description: "Clear title 'A' Khata corner residential plot inside gated layout with underground wiring and asphalt roads.",
      listingType: "SALE" as const,
      propertyType: "PLOT" as const,
      price: 8400000,
      bedrooms: null,
      bathrooms: null,
      areaSqft: 2400,
      city: "Bengaluru",
      locality: "Electronic City",
      address: "Plot 45, Green Meadows, Phase 1, Electronic City, Bengaluru",
      amenities: "24x7 Security, Water Supply, Children Play Area",
      ownerId: owner.id,
      approvalStatus: "APPROVED" as const,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200",
    },

    // Additional Properties for deep testing
    {
      title: "Luxury 3BHK Penthouse in Koramangala with Rooftop Garden",
      slug: "luxury-3bhk-penthouse-koramangala-rooftop",
      description: "Spacious penthouse in 4th Block Koramangala. High ceilings, wooden flooring, modular kitchen, and scenic city views.",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      price: 22500000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 2100,
      city: "Bengaluru",
      locality: "Koramangala",
      address: "Penthouse 501, Oakwood Residency, 80ft Road, Koramangala, Bengaluru",
      amenities: "Gymnasium, Lift, 24x7 Security, Power Backup",
      ownerId: dealer.id,
      approvalStatus: "APPROVED" as const,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    },
    {
      title: "Smart 2BHK Apartment for Sale in Electronic City Phase 1",
      slug: "smart-2bhk-apartment-sale-electronic-city",
      description: "Ready-to-move 2BHK flat close to Infosys and Wipro campuses. Excellent rental yield for IT professionals.",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      price: 5800000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1050,
      city: "Bengaluru",
      locality: "Electronic City",
      address: "Flat 302, Cyber Heights, Phase 1, Electronic City, Bengaluru",
      amenities: "Power Backup, Lift, Swimming Pool, Security",
      ownerId: owner.id,
      approvalStatus: "APPROVED" as const,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    },

    // PENDING Properties (for Admin Moderation queue testing)
    {
      title: "Modern 3BHK High-Rise with Panoramic City View",
      slug: "modern-3bhk-high-rise-pending-approval",
      description: "Brand new unoccupied 3BHK flat on 22nd floor with unobstructed skyline vistas. Ready for fitouts.",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      price: 14200000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1720,
      city: "Bengaluru",
      locality: "Whitefield",
      address: "Flat 2201, Prestige Boulevard, Whitefield, Bengaluru",
      amenities: "Swimming Pool, Gymnasium, Club House, Security",
      ownerId: ownerPending.id,
      approvalStatus: "PENDING" as const,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    },
    {
      title: "Furnished Office Floor in Tech Corridor for Immediate Lease",
      slug: "furnished-office-floor-tech-corridor-pending",
      description: "Plug and play 40-workstation setup with 2 conference rooms, server room, and executive cabins.",
      listingType: "RENT" as const,
      propertyType: "OFFICE" as const,
      price: 195000,
      bedrooms: null,
      bathrooms: 3,
      areaSqft: 2800,
      city: "Bengaluru",
      locality: "Koramangala",
      address: "Level 3, Business Hub, Intermediate Ring Road, Koramangala, Bengaluru",
      amenities: "High Speed Elevators, 100% DG Backup, Centralized AC",
      ownerId: dealerPending.id,
      approvalStatus: "PENDING" as const,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200",
    },
  ];

  let samplePropForEnquiry = null;

  for (const p of propertiesList) {
    const { imageUrl, ...pData } = p;
    const prop = await prisma.property.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...pData,
        images: {
          create: [{ url: imageUrl, order: 0 }],
        },
      },
    });
    if (!samplePropForEnquiry && prop.approvalStatus === "APPROVED") {
      samplePropForEnquiry = prop;
    }
  }

  // 8. Enquiries
  console.log("7/15 Seeding Enquiries...");
  if (samplePropForEnquiry) {
    await prisma.enquiry.createMany({
      data: [
        {
          name: "Vikas Kulkarni",
          phone: "+91 98450 12345",
          email: "vikas.kulkarni@gmail.com",
          message: "Interested in visiting this property this Saturday at 11:00 AM. Is price negotiable?",
          propertyId: samplePropForEnquiry.id,
          buyerId: buyerUser1.id,
        },
        {
          name: "Meera Sen",
          phone: "+91 98450 67890",
          email: "meera.sen@outlook.com",
          message: "Please share floor plan and bank loan approval status for this project.",
          propertyId: samplePropForEnquiry.id,
          buyerId: buyerUser2.id,
        },
        {
          name: "Siddharth Rao",
          phone: "+91 98765 99887",
          email: "siddharth.rao@gmail.com",
          message: "Can we arrange a video tour of the property and discuss the possession date?",
          propertyId: samplePropForEnquiry.id,
          buyerId: buyerUser3.id,
        },
      ],
      skipDuplicates: true,
    });
  }

  // 9. B2B Deals
  console.log("8/15 Seeding B2B Deals Engine...");

  // Closed Deal
  const dealClosed = await prisma.deal.upsert({
    where: { id: "deal-closed-001" },
    update: {},
    create: {
      id: "deal-closed-001",
      dealValue: 12000000,
      status: "CLOSED",
      propertyTitle: "Sobha Dream Acres 3BHK Unit 402",
      buyerAgentId: agentProfile1.id,
      sellerAgentId: agentProfile2.id,
      totalCommission: 240000,
      platformPercent: 10,
      platformCommission: 24000,
      buyerCommission: 108000,
      sellerCommission: 108000,
      commissionDistributed: true,
      tokenAmount: 500000,
      tokenDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      agreementDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      registryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      paymentMode: "BANK_TRANSFER",
      note: "Successfully closed luxury apartment transaction with zero legal discrepancies.",
    },
  });

  // Registry Completed
  await prisma.deal.upsert({
    where: { id: "deal-registry-002" },
    update: {},
    create: {
      id: "deal-registry-002",
      dealValue: 8500000,
      status: "REGISTRY_COMPLETED",
      propertyTitle: "Prestige Lakeside Habitat 2BHK Resale",
      buyerAgentId: agentProfile1.id,
      sellerAgentId: agentProfile2.id,
      totalCommission: 170000,
      platformPercent: 10,
      platformCommission: 17000,
      buyerCommission: 76500,
      sellerCommission: 76500,
      commissionDistributed: false,
      tokenAmount: 200000,
      tokenDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      registryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      paymentMode: "BANK_TRANSFER",
    },
  });

  // Agreement Done
  await prisma.deal.upsert({
    where: { id: "deal-agreement-003" },
    update: {},
    create: {
      id: "deal-agreement-003",
      dealValue: 16500000,
      status: "AGREEMENT_DONE",
      propertyTitle: "Penthouse Suite in Koramangala 4th Block",
      buyerAgentId: agentProfile1.id,
      sellerAgentId: agentProfile2.id,
      totalCommission: 330000,
      platformPercent: 10,
      platformCommission: 33000,
      buyerCommission: 148500,
      sellerCommission: 148500,
      tokenAmount: 500000,
      tokenDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      agreementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      paymentMode: "BANK_TRANSFER",
    },
  });

  // Token Received
  await prisma.deal.upsert({
    where: { id: "deal-token-004" },
    update: {},
    create: {
      id: "deal-token-004",
      dealValue: 21000000,
      status: "TOKEN_RECEIVED",
      propertyTitle: "Gated Villa in Sarjapur Road",
      buyerAgentId: agentProfile2.id,
      sellerAgentId: agentProfile1.id,
      totalCommission: 420000,
      platformPercent: 10,
      platformCommission: 42000,
      buyerCommission: 189000,
      sellerCommission: 189000,
      tokenAmount: 1000000,
      tokenDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      paymentMode: "BANK_TRANSFER",
    },
  });

  // Active Negotiation Stage
  await prisma.deal.upsert({
    where: { id: "deal-active-005" },
    update: {},
    create: {
      id: "deal-active-005",
      dealValue: 15000000,
      status: "ACTIVE",
      propertyTitle: "Commercial Penthouse Suite in Indiranagar",
      buyerAgentId: agentProfile1.id,
      totalCommission: 300000,
      platformPercent: 10,
      platformCommission: 30000,
      paymentMode: "BANK_TRANSFER",
    },
  });

  // 10. Commission Ledger
  console.log("9/15 Seeding Commission Ledger...");
  await prisma.commissionLedgerEntry.createMany({
    data: [
      {
        agentId: agentProfile1.id,
        type: "REGISTRATION_REFERRAL",
        amount: 2000,
        refId: investorProfile1.id,
        note: "10% referral commission for investor Sanjay Agarwal registration fee",
      },
      {
        agentId: agentProfile1.id,
        type: "REGISTRATION_REFERRAL",
        amount: 2000,
        refId: investorProfile2.id,
        note: "10% referral commission for investor Kavita Singhania registration fee",
      },
      {
        agentId: agentProfile1.id,
        type: "DEAL_PROFIT_SHARE",
        amount: 108000,
        refId: dealClosed.id,
        note: "B2B Deal Buyer-Side Commission for Sobha Dream Acres",
      },
    ],
    skipDuplicates: true,
  });

  // 11. Investor Profit Distributions & Ledger
  console.log("10/15 Seeding Investor Profit Ledger...");
  await prisma.profitDistribution.upsert({
    where: { id: "profit-dist-001" },
    update: {},
    create: {
      id: "profit-dist-001",
      investorProfileId: investorProfile1.id,
      agentId: agentProfile1.id,
      totalProfit: 500000,
      agentShare: 50000,
      expenseShare: 50000,
      investorShare: 200000,
      companyShare: 200000,
      paymentMode: "BANK_TRANSFER",
      note: "Q3 Project Profit Share on Whitefield Resale Flip",
    },
  });

  await prisma.investorLedgerEntry.createMany({
    data: [
      {
        investorProfileId: investorProfile1.id,
        amount: 200000,
        customerTransactionRef: "TXN-BLR-2026-9901",
        holdDurationDays: 45,
        refId: "profit-dist-001",
        note: "40% net profit credited from Whitefield Resale Flip transaction",
      },
      {
        investorProfileId: investorProfile2.id,
        amount: 150000,
        customerTransactionRef: "TXN-BLR-2026-9902",
        holdDurationDays: 60,
        note: "Pre-construction booking exit profit credit",
      },
    ],
    skipDuplicates: true,
  });

  // 12. Payout Requests
  console.log("11/15 Seeding Payout Requests...");
  await prisma.payoutRequest.upsert({
    where: { id: "payout-pending-001" },
    update: {},
    create: {
      id: "payout-pending-001",
      agentId: agentProfile1.id,
      grossAmount: 20000,
      tdsPercent: 5,
      tdsAmount: 1000,
      netAmount: 19000,
      status: "PENDING",
      paymentMode: "BANK_TRANSFER",
    },
  });

  await prisma.payoutRequest.upsert({
    where: { id: "payout-paid-002" },
    update: {},
    create: {
      id: "payout-paid-002",
      agentId: agentProfile1.id,
      grossAmount: 10000,
      tdsPercent: 5,
      tdsAmount: 500,
      netAmount: 9500,
      status: "PAID",
      paymentMode: "UPI",
      processedAt: new Date(),
    },
  });

  await prisma.payoutRequest.upsert({
    where: { id: "payout-paid-003" },
    update: {},
    create: {
      id: "payout-paid-003",
      agentId: agentProfile2.id,
      grossAmount: 15000,
      tdsPercent: 5,
      tdsAmount: 750,
      netAmount: 14250,
      status: "PAID",
      paymentMode: "BANK_TRANSFER",
      processedAt: new Date(),
    },
  });

  // 13. Cascade Dispatch Requests & Notifications
  console.log("12/15 Seeding Cascade Dispatch...");
  const dispatchActive = await prisma.dispatchRequest.upsert({
    where: { id: "dispatch-active-001" },
    update: {},
    create: {
      id: "dispatch-active-001",
      buyerId: buyerUser1.id,
      latitude: 12.9698,
      longitude: 77.75,
      amount: 100,
      agentSplit: 50,
      companySplit: 50,
      paymentMode: "UPI",
      status: "SEARCHING",
      currentRadiusKm: 3,
      currentBatch: 2,
    },
  });

  await prisma.dispatchNotification.upsert({
    where: {
      dispatchRequestId_agentId: {
        dispatchRequestId: dispatchActive.id,
        agentId: agentProfile1.id,
      },
    },
    update: {},
    create: {
      dispatchRequestId: dispatchActive.id,
      agentId: agentProfile1.id,
      batch: 1,
    },
  });

  const dispatchMatched = await prisma.dispatchRequest.upsert({
    where: { id: "dispatch-matched-002" },
    update: {},
    create: {
      id: "dispatch-matched-002",
      buyerId: buyerUser2.id,
      latitude: 12.9784,
      longitude: 77.6408,
      amount: 100,
      agentSplit: 50,
      companySplit: 50,
      paymentMode: "UPI",
      status: "MATCHED",
      currentRadiusKm: 1,
      currentBatch: 1,
      acceptedByAgentId: agentProfile1.id,
      acceptedAt: new Date(),
    },
  });

  // 14. B2B Broadcasts & Agent Chat
  console.log("13/15 Seeding B2B Agent Broadcasts & Chat...");
  const broadcast1 = await prisma.broadcast.upsert({
    where: { id: "broadcast-001" },
    update: {},
    create: {
      id: "broadcast-001",
      agentId: agentProfile2.id,
      latitude: 12.9698,
      longitude: 77.75,
      radiusKm: 3,
      society: "Prestige Lakeside Habitat",
      flatSize: "3BHK",
      txnType: "BUY",
      budgetMin: 11000000,
      budgetMax: 14000000,
      status: "OPEN",
    },
  });

  await prisma.broadcastResponse.upsert({
    where: {
      broadcastId_agentId: {
        broadcastId: broadcast1.id,
        agentId: agentProfile1.id,
      },
    },
    update: {},
    create: {
      broadcastId: broadcast1.id,
      agentId: agentProfile1.id,
    },
  });

  await prisma.agentChatMessage.createMany({
    data: [
      {
        broadcastId: broadcast1.id,
        fromAgentId: agentProfile1.id,
        toAgentId: agentProfile2.id,
        message: "Hi Rajesh, I have an exclusive 3BHK in Tower 5 at 1.35 Cr ready for immediate visit.",
      },
      {
        broadcastId: broadcast1.id,
        fromAgentId: agentProfile2.id,
        toAgentId: agentProfile1.id,
        message: "Great! My buyer has pre-approved home loan. Can we schedule visit tomorrow at 4 PM?",
      },
      {
        broadcastId: broadcast1.id,
        fromAgentId: agentProfile1.id,
        toAgentId: agentProfile2.id,
        message: "Yes, 4 PM is confirmed. I'll send the key handover pass on WhatsApp.",
      },
    ],
    skipDuplicates: true,
  });

  const broadcast2 = await prisma.broadcast.upsert({
    where: { id: "broadcast-002" },
    update: {},
    create: {
      id: "broadcast-002",
      agentId: agentProfile1.id,
      latitude: 12.9784,
      longitude: 77.6408,
      radiusKm: 5,
      society: "Sobha Dream Acres",
      flatSize: "2BHK",
      txnType: "RENT",
      budgetMin: 35000,
      budgetMax: 45000,
      status: "OPEN",
    },
  });

  // 15. Visits, Anti-Bypass Deeds & Vault
  console.log("14/15 Seeding Visits, Anti-Bypass Deeds & Vault...");
  await prisma.visitAppointment.upsert({
    where: { bookingCode: "APT-BLR-2026-101" },
    update: {},
    create: {
      bookingCode: "APT-BLR-2026-101",
      buyerId: buyerUser1.id,
      agentId: agentProfile1.id,
      masterPropertyId: master1.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      followUpDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  await prisma.visitAppointment.upsert({
    where: { bookingCode: "APT-BLR-2026-102" },
    update: {},
    create: {
      bookingCode: "APT-BLR-2026-102",
      buyerId: buyerUser2.id,
      agentId: agentProfile1.id,
      masterPropertyId: master2.id,
      scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      status: "COMPLETED",
    },
  });

  await prisma.propertyVisitLog.createMany({
    data: [
      {
        customerPhone: "+91 98765 43210",
        customerName: "Rahul Verma",
        masterPropertyId: master1.id,
        agentId: agentProfile1.id,
        otpVerified: true,
        isPrimaryOwner: true,
      },
    ],
    skipDuplicates: true,
  });

  const directVisit = await prisma.directPropertyVisit.create({
    data: {
      agentListingId: agentListing1.id,
      buyerId: buyerUser1.id,
      ownerPhone: "+91 90000 00000",
      otp: "849201",
      otpVerified: true,
      otpVerifiedAt: new Date(),
      latitude: 12.9698,
      longitude: 77.75,
      locationAccuracy: 8.5,
      notes: "Physical site inspection completed. Buyer validated structural quality.",
    },
  });

  await prisma.platformAntiBypassAgreement.create({
    data: {
      directVisitId: directVisit.id,
      agentListingId: agentListing1.id,
      buyerId: buyerUser1.id,
      sellerPhone: "+91 90000 00000",
      sellerName: "BayaEstate Realty (Dealer)",
      buyerName: "Rahul Verma",
      buyerPhone: "+91 98765 43210",
      propertyAddress: "Flat 1402, Prestige Lakeside Habitat, Whitefield, Bengaluru",
      legalTermsSummary: "Standard 1% platform facilitation deed executed upon verified physical site visit.",
      serviceFeePercent: 1.0,
      buyerSigned: true,
      buyerSignedAt: new Date(),
      sellerSigned: true,
      sellerSignedAt: new Date(),
      status: "ACTIVE",
    },
  });

  await prisma.propertyUnlock.upsert({
    where: {
      agentListingId_buyerId: {
        agentListingId: agentListing1.id,
        buyerId: buyerUser1.id,
      },
    },
    update: {},
    create: {
      agentListingId: agentListing1.id,
      buyerId: buyerUser1.id,
      amount: 100,
      agentSplit: 50,
      companySplit: 50,
      assignedAgentId: agentProfile1.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  if (samplePropForEnquiry) {
    await prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: buyerUser1.id,
          propertyId: samplePropForEnquiry.id,
        },
      },
      update: {},
      create: {
        userId: buyerUser1.id,
        propertyId: samplePropForEnquiry.id,
      },
    });
  }

  await prisma.documentVaultItem.createMany({
    data: [
      {
        agentId: agentProfile1.id,
        masterPropertyId: master1.id,
        type: "SALE_DEED",
        title: "Prestige Lakeside Habitat Mother Deed",
        url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
        uploadedByUserId: agentUser1.id,
      },
      {
        investorId: investorProfile1.id,
        type: "SIGNED_AGREEMENT",
        title: "Q3 Joint Venture Agreement - Signed",
        url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
        uploadedByUserId: admin.id,
      },
      {
        agentId: agentProfile1.id,
        type: "REGISTRY",
        title: "Approved Layout Plan & Occupancy Certificate",
        url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
        uploadedByUserId: agentUser1.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.customerInvestorAgreement.create({
    data: {
      investorId: investorProfile1.id,
      customerName: "Ramesh Sharma",
      customerPhone: "+91 94444 88888",
      agreementDate: new Date(),
      lockInPeriodMonths: 12,
      flatUnitNumber: "Unit 304, Tower B",
      terms: "Guaranteed buy-back option with 14% IRR minimum floor rate.",
      signedCopyUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
      paymentAmount: 2500000,
      paymentMode: "BANK_TRANSFER",
    },
  });

  // 15/15 Trust & Ratings
  console.log("15/15 Seeding Trust & Ratings...");
  await prisma.agentRating.createMany({
    data: [
      {
        agentId: agentProfile1.id,
        customerPhone: "+91 98765 43210",
        stars: 5,
        review: "Extremely professional! Arranged the site visit smoothly and helped with accurate price negotiations.",
      },
      {
        agentId: agentProfile1.id,
        customerPhone: "+91 98765 43211",
        stars: 5,
        review: "Very transparent paperwork and zero broker pressure. Highly recommended!",
      },
      {
        agentId: agentProfile2.id,
        customerPhone: "+91 99999 00001",
        stars: 4,
        review: "Good communication, showed 3 good properties matching my exact requirement in Indiranagar.",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.agentWarning.create({
    data: {
      agentId: agentProfile2.id,
      reason: "Minor delay in submitting customer visit follow-up report within 24 hours.",
    },
  });

  console.log("🎉 SUCCESS: All dummy data seeded across all portals, pages & routes!");
}

main()
  .catch((err) => {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
