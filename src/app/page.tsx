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
import { AcresTopCities } from "@/components/acres/AcresTopCities";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal, Stagger, StaggerItem, HoverLift } from "@/components/ui/Motion";
import { Faq } from "@/components/ui/Faq";
import {
  ArrowRight,
  Building2,
  Home as HomeIcon,
  BedDouble,
  Briefcase,
  Rocket,
  Landmark,
  ShieldCheck,
  Handshake,
  MapPinned,
  FileLock2,
  UserPlus,
  Search,
  KeyRound,
  Check,
  Crown,
} from "lucide-react";

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

  // Fetch Recommended Properties for 99acres-Style Split Section (Screenshot 2 Benchmark)
  const recommendedProperties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Fetch Buy Properties (Admin-Curated Luxury Flats & Villas)
  const buyProperties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      listingType: "SALE",
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Fetch Rental Flats & Apartments
  const rentalFlats = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      listingType: "RENT",
      propertyType: { in: ["APARTMENT", "VILLA", "INDEPENDENT_HOUSE"] },
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Fetch PG & Co-Living Spaces
  const pgProperties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      propertyType: "PG",
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  // Fetch Commercial Properties (Offices, Shops, Warehouses)
  const commercialProperties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      propertyType: { in: ["COMMERCIAL", "OFFICE", "SHOP", "WAREHOUSE"] },
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const propertyCount = await prisma.property.count({
    where: { approvalStatus: "APPROVED", status: "AVAILABLE", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
  });

  const brandName =
    settings.siteName && settings.siteName !== "BayaEstate" && !settings.siteName.toLowerCase().includes("noida prime") && !settings.siteName.toLowerCase().includes("baya prime")
      ? settings.siteName
      : "Pronesto";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName,
    url: SITE_URL,
    logo: settings.logoUrl ? { "@type": "ImageObject", url: settings.logoUrl } : undefined,
  };

  const categories = [
    { title: "Flats & Apartments", sub: "Rent or buy", href: "/properties?propertyType=APARTMENT", icon: <Building2 className="h-6 w-6" />, tint: "from-brand-500 to-brand-700" },
    { title: "Villas & Houses", sub: "Independent living", href: "/properties?propertyType=VILLA", icon: <HomeIcon className="h-6 w-6" />, tint: "from-emerald-500 to-emerald-700" },
    { title: "PG / Co-Living", sub: "Meals & furnished", href: "/properties?listingType=RENT&propertyType=PG", icon: <BedDouble className="h-6 w-6" />, tint: "from-violet-500 to-violet-700" },
    { title: "Commercial", sub: "Offices & shops", href: "/properties?propertyType=COMMERCIAL", icon: <Briefcase className="h-6 w-6" />, tint: "from-amber-500 to-orange-600" },
    { title: "New Launches", sub: "RERA projects", href: "/properties?listingType=SALE&condition=NEW_BOOKING", icon: <Rocket className="h-6 w-6" />, tint: "from-rose-500 to-rose-700" },
    { title: "Home Loans", sub: "EMI calculator", href: "/properties?listingType=SALE", icon: <Landmark className="h-6 w-6" />, tint: "from-cyan-500 to-sky-700" },
  ];

  const pillars = [
    { icon: <Handshake className="h-5 w-5" />, title: "Zero-brokerage rentals", text: "Connect straight with owners. No middlemen, no commission." },
    { icon: <ShieldCheck className="h-5 w-5" />, title: "Admin-verified buying", text: "Every sale listing is checked for title and RERA before it goes live." },
    { icon: <MapPinned className="h-5 w-5" />, title: "OTP + GPS site visits", text: "Visits are confirmed on location, so every enquiry is genuine." },
    { icon: <FileLock2 className="h-5 w-5" />, title: "Secure document vault", text: "Agreements and KYC stay encrypted and in one place." },
  ];

  const topMetroCorridors = [
    { title: "Golf Course Road, Gurgaon", tagline: "Ultra-luxury residences", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80", query: "Gurgaon", stats: "DLF Camellias · Aralias" },
    { title: "Noida Expressway", tagline: "IT corridors & green living", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80", query: "Noida", stats: "Sector 150 · 128 · 43" },
    { title: "Whitefield & ORR", tagline: "Tech parks & gated communities", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80", query: "Bengaluru", stats: "Prestige · Sobha · E-City" },
    { title: "Lower Parel & Worli", tagline: "Sea-view towers", image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&auto=format&fit=crop&q=80", query: "Mumbai", stats: "World Towers · Bandra-Worli" },
  ];

  const steps = [
    { icon: <UserPlus className="h-5 w-5" />, title: "Create your account", text: "Sign up as an owner or channel partner in under a minute." },
    { icon: <Search className="h-5 w-5" />, title: "List or discover", text: "Post a rental, or browse verified homes by city, budget and type." },
    { icon: <KeyRound className="h-5 w-5" />, title: "Visit & move in", text: "Schedule an OTP-verified visit, sign digitally and get the keys." },
  ];

  const faqs = [
    { q: "Why can only the admin team list properties for sale?", a: "To keep the Buy section free of fake and duplicate listings, every sale property is registered by our admin team after a physical and legal title audit and RERA verification." },
    { q: "Can owners and channel partners list rental properties?", a: "Yes. Anyone can register and list rentals — flats, PGs & co-living, commercial spaces, villas and independent floors. Listings are reviewed before they go live." },
    { q: "How does the zero-brokerage rental promise work?", a: "Tenants browse verified owner listings and schedule visits with OTP verification. There is no broker commission on direct owner connects." },
    { q: "What details do PG listings show?", a: "Sharing type, gender preference, meal inclusion, security deposit and house rules — all shown upfront so there are no surprises." },
  ];

  const grid = (cols: 3 | 4) =>
    `mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`;

  return (
    <div className="min-h-screen bg-white text-ink">
      <JsonLd data={organizationJsonLd} />

      <AcresHero
        propertyCount={propertyCount || 14}
        agentCount={150}
        cityCount={dbCities.length || 8}
        currentCityName={location?.cityName}
        cities={dbCities}
      />

      {/* Trust pillars overlapping hero */}
      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Stagger className="grid grid-cols-1 gap-3 rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <div className="flex h-full items-start gap-3 rounded-2xl p-4 transition hover:bg-brand-50/60">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-md shadow-brand-600/25">
                  {p.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">{p.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{p.text}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Browse by need" title="What are you looking for?" subtitle="Jump straight into the kind of space that fits your life." />
        <Stagger className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <StaggerItem key={c.title}>
              <HoverLift className="h-full">
                <Link href={c.href} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft transition hover:border-transparent hover:shadow-lift">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tint} text-white shadow-lg transition group-hover:scale-110 group-hover:-rotate-6`}>
                    {c.icon}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">{c.title}</h3>
                  <p className="text-xs text-slate-500">{c.sub}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                </Link>
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Fresh listings + owner CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fresh on Pronesto" title="Recommended for you" subtitle="Newly verified homes, hand-picked from the latest approvals." href="/properties" />
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-8 xl:col-span-9 xl:grid-cols-3">
            {recommendedProperties.map((property) => (
              <StaggerItem key={property.slug}>
                <PropertyCard property={property} />
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="lg:col-span-4 xl:col-span-3">
            <div className="relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-[22px] bg-brand-950 p-6 text-white shadow-soft">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/40 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-300">
                  <Crown className="h-3.5 w-3.5" /> For owners
                </span>
                <h3 className="font-display mt-4 text-2xl font-semibold leading-snug">
                  Got a rental to list?
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Reach genuine tenants directly and skip broker fees entirely.
                </p>
              </div>
              <div className="relative mt-6">
                <Link href="/list-property/request" className="shine inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-gold-300">
                  Post property <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="mt-3 block text-center text-xs font-semibold text-slate-300 hover:text-white">
                  Already registered? Sign in
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BUY — admin curated, dark showcase */}
      {buyProperties.length > 0 && (
        <section className="relative overflow-hidden bg-brand-950 py-20 text-white">
          <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <div className="absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-brand-500/30 blur-[120px]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader tone="dark" eyebrow="Admin-curated exclusives" title="Residences for sale, verified by us" subtitle="Clear title, RERA sanction and escrow safety on every listing." href="/properties?listingType=SALE" hrefLabel="Explore all homes" />
            <Stagger className={grid(3)}>
              {buyProperties.map((property) => (
                <StaggerItem key={property.slug}>
                  <PropertyCard property={property} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* RENT */}
      {rentalFlats.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="0% brokerage" title="Rental flats & gated societies" subtitle="1 BHK to 4+ BHK apartments, builder floors and villas straight from owners." href="/properties?listingType=RENT" hrefLabel="All rentals" />
          <Stagger className={grid(3)}>
            {rentalFlats.map((property) => (
              <StaggerItem key={property.slug}>
                <PropertyCard property={property} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* PG */}
      {pgProperties.length > 0 && (
        <section className="border-y border-slate-200/70 bg-gradient-to-b from-brand-50/60 to-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="Co-living & student housing" title="Premium PG & co-living" subtitle="WiFi, meals, housekeeping and flexible stays near tech parks and campuses." href="/properties?listingType=RENT&propertyType=PG" hrefLabel="Explore PGs" />
            <Stagger className={grid(4)}>
              {pgProperties.map((property) => (
                <StaggerItem key={property.slug}>
                  <PropertyCard property={property} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* Commercial */}
      {commercialProperties.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Grade-A commercial" title="Offices, showrooms & warehouses" subtitle="High-footfall corners, plug-and-play workspaces and logistics units." href="/properties?listingType=RENT&propertyType=COMMERCIAL" hrefLabel="View commercial" />
          <Stagger className={grid(4)}>
            {commercialProperties.map((property) => (
              <StaggerItem key={property.slug}>
                <PropertyCard property={property} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <AcresTopCities />

      {/* Corridors */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader align="center" eyebrow="Investment hotspots" title="Top metro corridors" subtitle="Where capital appreciation meets verified title histories." />
        <Stagger className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {topMetroCorridors.map((sec) => (
            <StaggerItem key={sec.title}>
              <Link href={`/properties?city=${encodeURIComponent(sec.query)}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[26px] bg-ink shadow-soft">
                <Image src={sec.image} alt={sec.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 text-white">
                  <span className="glass-dark inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold">{sec.stats}</span>
                  <h3 className="font-display mt-3 text-xl font-semibold leading-tight">{sec.title}</h3>
                  <p className="mt-1 text-xs text-slate-300">{sec.tagline}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-300 transition-all group-hover:gap-2">
                    Explore <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Two ways in: rent vs buy */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="relative h-full overflow-hidden rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-8 shadow-soft sm:p-10">
              <span className="inline-flex rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Rent</span>
              <h3 className="font-display mt-4 text-3xl font-semibold text-ink">Open to every owner</h3>
              <p className="mt-2 text-slate-600">Anyone can register and list a rental in minutes — owners, dealers and channel partners alike.</p>
              <ul className="mt-6 space-y-2.5 text-sm font-medium text-slate-700">
                {["Flats, PGs, commercial & villas", "Photo, amenity and pricing details", "Reviewed and approved before going live"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /></span>{t}</li>
                ))}
              </ul>
              <Link href="/list-property/request" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
                List a rental <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-[28px] bg-brand-950 p-8 text-white shadow-soft sm:p-10">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold-400/20 blur-3xl" />
              <span className="relative inline-flex rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">Buy</span>
              <h3 className="font-display relative mt-4 text-3xl font-semibold">Curated by our admin team</h3>
              <p className="relative mt-2 text-slate-300">Sale properties are registered only by the platform, so what you see is audited and genuine.</p>
              <ul className="relative mt-6 space-y-2.5 text-sm font-medium text-slate-200">
                {["Physical & legal title audit", "RERA sanction verified", "Escrow-protected transactions"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/20 text-gold-300"><Check className="h-3 w-3" /></span>{t}</li>
                ))}
              </ul>
              <Link href="/properties?listingType=SALE" className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink transition hover:bg-gold-300">
                Browse homes for sale <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200/70 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader align="center" eyebrow="How it works" title="From search to keys in three steps" />
          <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((st, i) => (
              <StaggerItem key={st.title}>
                <div className="relative h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft">
                  <span className="font-display absolute right-6 top-4 text-6xl font-semibold text-brand-100">{i + 1}</span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">{st.icon}</span>
                  <h3 className="relative mt-5 text-lg font-bold text-ink">{st.title}</h3>
                  <p className="relative mt-1.5 text-sm text-slate-500">{st.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionHeader align="center" eyebrow="Got questions?" title="Frequently asked" />
        <Faq items={faqs} />
      </section>
    </div>
  );
}
