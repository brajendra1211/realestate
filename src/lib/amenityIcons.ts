// Keyword-matched rather than an exact-name lookup table, so an admin-added
// amenity ("Rooftop Garden", "EV Charging") still gets a sensible icon
// instead of falling through to the generic one just because it isn't a
// verbatim match for the seeded list (prisma/seed-production.ts).
const AMENITY_ICONS: [string[], string][] = [
  [["pool", "swim"], "\u{1F3CA}"],
  [["gym", "fitness"], "\u{1F3CB}"],
  [["club"], "\u{1F3DB}"],
  [["play", "kid", "children"], "\u{1F3A0}"],
  [["garden", "park", "landscap"], "\u{1F333}"],
  [["security", "guard"], "\u{1F6E1}"],
  [["cctv", "camera", "surveillance"], "\u{1F4F9}"],
  [["power", "backup", "generator"], "\u{1F50B}"],
  [["car parking", "visitor parking", "parking"], "\u{1F17F}️"],
  [["lift", "elevator"], "\u{1F6D7}"],
  [["gas"], "\u{1F525}"],
  [["water"], "\u{1F6B0}"],
  [["rain", "harvest"], "\u{1F4A7}"],
  [["indoor game", "game room"], "\u{1F3AE}"],
  [["jog", "track", "walk"], "\u{1F3C3}"],
  [["amphitheatre", "amphitheater", "theatre", "theater"], "\u{1F3AD}"],
  [["hall", "banquet", "multipurpose"], "\u{1F3E2}"],
  [["intercom", "phone"], "☎️"],
  [["fire"], "\u{1F9EF}"],
  [["wifi", "internet"], "\u{1F4F6}"],
  [["lake", "river", "waterfront"], "\u{1F30A}"],
  [["study"], "\u{1F4DA}"],
  [["servant"], "\u{1F9F9}"],
];

export function amenityIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of AMENITY_ICONS) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return "✅";
}
