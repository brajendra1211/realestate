import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";
import { AcresHero } from "@/components/acres/AcresHero";
import { PropertyCard } from "@/components/PropertyCard";

export default async function Home() {
  const [settings, location, dbCities] = await Promise.all([
    getSiteSettings(),
    getLocationCookie(),
    prisma.city.findMany({
      where: { published: true },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const properties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const propertyCount = await prisma.property.count({
    where: { approvalStatus: "APPROVED", status: "AVAILABLE", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
  });

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName || "Noida Prime Properties",
    url: SITE_URL,
    logo: settings.logoUrl ? { "@type": "ImageObject", url: settings.logoUrl } : undefined,
  };

  const topSectors = [
    {
      title: "Sector 150, Noida",
      tagline: "Sports City & Expressway Green Belt",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      query: "Sector 150",
    },
    {
      title: "Sector 128, Noida",
      tagline: "Golf Course Living & Jaypee Wish Town",
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&auto=format&fit=crop&q=80",
      query: "Sector 128",
    },
    {
      title: "Sector 43 & Central Noida",
      tagline: "Forest-Themed Residencies & Metro Connected",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80",
      query: "Sector 43",
    },
    {
      title: "Greater Noida West",
      tagline: "Fastest-Growing Affordable & Mid-Segment Hub",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80",
      query: "Greater Noida West",
    },
  ];

  const topDevelopers = [
    { name: "Godrej Properties", tag: "Forest & Eco Residencies", projects: "8 Projects in Noida" },
    { name: "ATS Infrastructure", tag: "Iconic High-Rises & Penthouses", projects: "12 Projects in Noida" },
    { name: "Mahagun Group", tag: "Luxury Golf Suites & Mansions", projects: "9 Projects in Noida" },
    { name: "Gaursons India", tag: "Integrated Mega Townships", projects: "15 Projects in NCR" },
    { name: "DLF Limited", tag: "Ultra-Luxury Living & Tech Hubs", projects: "6 Projects in NCR" },
    { name: "Tata Housing", tag: "Sustainable Modern Communities", projects: "5 Projects in NCR" },
  ];

  const commercialHotspots = [
    { name: "Sector 62 IT Park Corridor", desc: "Institutional & IT hubs, walking distance to Electronic City Metro Station." },
    { name: "Sector 132 / 142 Expressway", desc: "Grade-A office towers, Advant Navis, and Fortune 500 corporate campuses." },
    { name: "Sector 18 Commercial District", desc: "Noida's premier retail, banking, showroom, and corporate hub." },
    { name: "Knowledge Park, Greater Noida", desc: "Educational institutes, data centers, and multi-modal logistics zone." },
  ];

  const testimonials = [
    {
      quote: "Found our 3 BHK home in Godrej Woods within a week. RERA documents and layout sanctions were verified transparently before token payment.",
      name: "Ankit Sharma",
      role: "Homeowner, Sector 43 Noida",
    },
    {
      quote: "Direct owner connect saved us heavy brokerage on our rental flat in Gaur City 2. Clean platform and very genuine listings.",
      name: "Priya & Rohit Verma",
      role: "Tenants, Greater Noida West",
    },
    {
      quote: "Assisted site visit service with dedicated relationship manager made inspecting multiple expressway properties effortless.",
      name: "Vikram Singhal",
      role: "Commercial Investor, Sector 132",
    },
  ];

  const faqs = [
    {
      q: "Are properties on Noida Prime Properties RERA approved?",
      a: "Yes. All featured new projects and developer inventories are cross-checked against official Uttar Pradesh RERA (UP RERA) registration numbers and sanction plans.",
    },
    {
      q: "Can I list my property for sale or rent for free?",
      a: "Yes! Individual property owners and certified channel partners can register and post properties completely free of cost with zero upfront charges.",
    },
    {
      q: "How can I schedule a physical site visit?",
      a: "Click on 'View Details' on any property card and click 'WhatsApp' to connect directly with our relationship manager who arranges doorstep cab assistance and on-ground tours.",
    },
    {
      q: "Which are the best sectors to invest in Noida currently?",
      a: "Sector 150 (Sports City), Sector 128 (Expressway Golf Corridor), Sector 43, and areas surrounding the upcoming Noida International Airport (Jewar) offer high capital appreciation.",
    },
  ];

  return (
    <div className="bg-white min-h-screen text-slate-900">
      <JsonLd data={organizationJsonLd} />

      {/* 1. HERO SECTION WITH SMART SEARCH */}
      <AcresHero
        propertyCount={propertyCount || 5}
        agentCount={150}
        cityCount={dbCities.length || 2}
        currentCityName={location?.cityName}
        cities={dbCities}
      />

      {/* 2. CURATED VERIFIED PROPERTIES SHOWCASE */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Verified Residences
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Properties in Noida & NCR
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Sanctioned layouts, authenticated ownership documents, and transparent pricing.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
          >
            <span>View All ({propertyCount})</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 3-Column Property Card Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      </section>

      {/* 3. BROWSE BY BUDGET & CONFIGURATION */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore by Budget & Configurations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Filter verified inventory according to your family requirements and investment capacity.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/properties?maxPrice=5000000"
              className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md transition group text-center"
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Affordable Homes</div>
              <div className="text-lg font-black text-slate-900 mt-1 group-hover:text-blue-600 transition">Under ₹50 Lakh</div>
              <p className="text-[11px] text-slate-500 mt-1">High-growth sectors & Noida Extension</p>
            </Link>

            <Link
              href="/properties?minPrice=5000000&maxPrice=15000000"
              className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md transition group text-center"
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mid-Segment Living</div>
              <div className="text-lg font-black text-slate-900 mt-1 group-hover:text-blue-600 transition">₹50L - ₹1.5 Cr</div>
              <p className="text-[11px] text-slate-500 mt-1">Gated societies with modern amenities</p>
            </Link>

            <Link
              href="/properties?minPrice=15000000&maxPrice=30000000"
              className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md transition group text-center"
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Premium Residencies</div>
              <div className="text-lg font-black text-slate-900 mt-1 group-hover:text-blue-600 transition">₹1.5 Cr - ₹3 Cr</div>
              <p className="text-[11px] text-slate-500 mt-1">Expressway towers & 3-4 BHK homes</p>
            </Link>

            <Link
              href="/properties?minPrice=30000000"
              className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md transition group text-center"
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ultra Luxury</div>
              <div className="text-lg font-black text-slate-900 mt-1 group-hover:text-blue-600 transition">Above ₹3 Crore</div>
              <p className="text-[11px] text-slate-500 mt-1">Golf suites, penthouses & villas</p>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
            <span className="text-slate-400">By BHK:</span>
            <Link href="/properties?bedrooms=1" className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-slate-700 transition">
              1 BHK Flats
            </Link>
            <Link href="/properties?bedrooms=2" className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-slate-700 transition">
              2 BHK Family Homes
            </Link>
            <Link href="/properties?bedrooms=3" className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-slate-700 transition">
              3 BHK Luxury Suites
            </Link>
            <Link href="/properties?bedrooms=4" className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-slate-700 transition">
              4+ BHK Penthouses
            </Link>
          </div>
        </div>
      </section>

      {/* 4. EXPLORE TOP LOCALITIES (VISUAL CARDS) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Explore Popular Localities in Noida
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Discover residential hotspots offering prime connectivity, top schools, and lush green belts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {topSectors.map((sec) => (
            <Link
              key={sec.title}
              href={`/properties?city=${encodeURIComponent(sec.query)}`}
              className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <Image
                  src={sec.image}
                  alt={sec.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-sm leading-snug">{sec.title}</h3>
                  <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">{sec.tagline}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. TOP BUILDERS & DEVELOPERS SPOTLIGHT */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5 mb-8">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Certified Partners</div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Leading Real Estate Developers
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Trusted builders delivering premium residential townships and commercial hubs across Noida & NCR.
              </p>
            </div>
            <Link href="/projects" className="text-xs font-bold text-blue-600 hover:underline">
              View All Projects →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topDevelopers.map((dev) => (
              <div key={dev.name} className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{dev.name}</h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    RERA Certified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{dev.tag}</p>
                <div className="mt-3 text-[11px] font-semibold text-blue-600">{dev.projects}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COMMERCIAL HUBS & OFFICE SPACES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Commercial & IT Hubs in Noida
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            High-yield commercial offices, retail shops, and corporate campuses in prime business zones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {commercialHotspots.map((hub) => (
            <div key={hub.name} className="p-5 rounded-xl border border-slate-200/80 bg-white space-y-2 shadow-xs">
              <div className="h-2 w-8 bg-blue-600 rounded-full" />
              <h3 className="font-bold text-slate-900 text-sm">{hub.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{hub.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. HOME LOAN ASSISTANCE & EMI GUIDE */}
      <section className="bg-slate-900 text-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300">
                Home Loan Assistance
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Planning Your Home Purchase in Noida?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Get pre-approved home loans starting from <strong className="text-white">8.35% p.a.</strong> with doorstep paperwork and minimal processing fees through our banking partners.
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-slate-300">
                <span>✓ SBI</span>
                <span>✓ HDFC Bank</span>
                <span>✓ ICICI Bank</span>
                <span>✓ Axis Bank</span>
                <span>✓ Bank of Baroda</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 max-w-md w-full">
              <div className="text-sm font-bold text-white">Direct Financial Advisory</div>
              <p className="text-xs text-slate-400">
                Our in-house loan experts compare offers across 15+ leading banks to secure the best loan tenure and lowest EMI for your property.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hello,%20I%20would%20like%20home%20loan%20assistance%20for%20Noida%20property"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
              >
                Get Loan Assistance on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CLIENT & BUYER TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Client Reviews</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            What Homebuyers Say About Us
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Authentic experiences from families and investors who bought or rented through Noida Prime Properties.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div key={idx} className="p-6 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-500 text-xs">
                  {"★".repeat(5)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs font-bold text-slate-900">{t.name}</div>
                <div className="text-[11px] text-slate-400">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Clear answers regarding buying, renting, and RERA compliance in Noida and Greater Noida.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-xs space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">{f.q}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. OWNER CALLOUT STRIP */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Looking to Sell or Rent Your Property in Noida?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              List your flat, villa, plot, or commercial space for free and connect with thousands of active buyers every month.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm shrink-0"
          >
            Post Property Free
          </Link>
        </div>
      </section>
    </div>
  );
}
