import Link from "next/link";

const SECTIONS = [
  {
    title: "Flats for Sale in India",
    links: [
      { label: "Flats for Sale in Bengaluru", href: "/properties?city=Bengaluru&propertyType=APARTMENT" },
      { label: "Flats for Sale in Mumbai", href: "/properties?city=Mumbai&propertyType=APARTMENT" },
      { label: "Flats for Sale in Delhi NCR", href: "/properties?city=Delhi&propertyType=APARTMENT" },
      { label: "Flats for Sale in Pune", href: "/properties?city=Pune&propertyType=APARTMENT" },
      { label: "Flats for Sale in Hyderabad", href: "/properties?city=Hyderabad&propertyType=APARTMENT" },
      { label: "Flats for Sale in Chennai", href: "/properties?city=Chennai&propertyType=APARTMENT" },
    ],
  },
  {
    title: "Properties for Rent",
    links: [
      { label: "Flats for Rent in Bengaluru", href: "/properties?city=Bengaluru&listingType=RENT" },
      { label: "Flats for Rent in Mumbai", href: "/properties?city=Mumbai&listingType=RENT" },
      { label: "Flats for Rent in Delhi NCR", href: "/properties?city=Delhi&listingType=RENT" },
      { label: "Furnished Flats for Rent", href: "/properties?listingType=RENT" },
      { label: "Independent House for Rent", href: "/properties?propertyType=INDEPENDENT_HOUSE&listingType=RENT" },
      { label: "Villas for Rent", href: "/properties?propertyType=VILLA&listingType=RENT" },
    ],
  },
  {
    title: "New Projects & Builders",
    links: [
      { label: "Upcoming Projects in Bengaluru", href: "/projects?city=Bengaluru" },
      { label: "RERA Approved Projects", href: "/projects" },
      { label: "Prestige Group Projects", href: "/developers" },
      { label: "Godrej Properties", href: "/developers" },
      { label: "DLF Luxury Residences", href: "/developers" },
      { label: "Sobha Developers", href: "/developers" },
    ],
  },
  {
    title: "Plots & Commercial",
    links: [
      { label: "Residential Plots for Sale", href: "/properties?propertyType=PLOT" },
      { label: "Gated Plots in Bengaluru", href: "/properties?city=Bengaluru&propertyType=PLOT" },
      { label: "Office Spaces for Sale", href: "/properties?propertyType=OFFICE" },
      { label: "Commercial Shops for Sale", href: "/properties?propertyType=COMMERCIAL" },
      { label: "Pre-Leased Commercial Units", href: "/properties?propertyType=COMMERCIAL" },
      { label: "Certified Channel Partners", href: "/dealers" },
    ],
  },
];

export function AcresSeoDirectory() {
  return (
    <section className="bg-slate-50 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
          Popular Real Estate Searches in India
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                {section.title}
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-[#0054a6] hover:underline transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
