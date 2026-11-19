import type { BrochureData } from "@/lib/brochure";

const NAVY = "#1E33A0";
const GOLD = "#F5A623";
const INK = "#121A3A";

const inr = (n: number) => "₹ " + n.toLocaleString("en-IN");
const label = (s: string) => s.replace(/_/g, " ");

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, color: NAVY, letterSpacing: 0.5 }}>{children}</div>
      <div style={{ flexGrow: 1, height: 2, background: GOLD }} />
    </div>
  );
}

/** A4 (794x1123) brochure, same look as the Pronesto brochure template. Pure markup, print-friendly. */
export function BrochureView({ d }: { d: BrochureData }) {
  const isRent = d.listingType === "RENT";
  const [hero, img2, img3] = d.images;
  const stats = [
    d.bedrooms != null ? { v: `${d.bedrooms} BHK`, k: "Configuration" } : { v: label(d.propertyType), k: "Type" },
    d.areaSqft ? { v: `${d.areaSqft} Sq.Ft.`, k: "Area" } : null,
    d.bathrooms != null ? { v: `${d.bathrooms} Baths`, k: "Bathrooms" } : null,
    d.furnishing ? { v: d.furnishing, k: "Furnishing" } : null,
  ].filter(Boolean) as { v: string; k: string }[];

  const details = [
    d.society ? ["Society", d.society] : null,
    d.floor ? ["Floor", d.floor] : null,
    d.furnishing ? ["Furnishing", d.furnishing] : null,
    d.propertyCode ? ["Property Code", d.propertyCode] : null,
  ].filter(Boolean) as [string, string][];

  const place = [d.society, d.locality, d.city].filter(Boolean).join(", ");

  return (
    <div
      className="pn-brochure"
      style={{
        width: 794, height: 1123, position: "relative", overflow: "hidden", background: "#fff",
        fontFamily: "'Montserrat', sans-serif", color: INK,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Montserrat:wght@400;500;600;700&family=Great+Vibes&family=Libre+Baskerville:wght@700&display=swap"
        rel="stylesheet"
      />
      <div style={{ position: "absolute", left: 402, top: -20, width: 412, height: 560, border: `3px solid ${GOLD}`, borderBottomLeftRadius: 260, boxSizing: "border-box" }} />

      {/* hero photo */}
      <div style={{ position: "absolute", left: 420, top: 0, width: 374, height: 520, borderBottomLeftRadius: 240, overflow: "hidden", background: `linear-gradient(135deg, ${NAVY}, #0F1733)` }}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={d.title} style={{ width: 374, height: 520, objectFit: "cover", display: "block" }} />
        )}
      </div>

      {isRent && (
        <div style={{ position: "absolute", left: 652, top: 392, width: 132, height: 132, borderRadius: "50%", background: GOLD, border: "6px solid #fff", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", zIndex: 3, boxShadow: "0 6px 18px rgba(15,23,51,.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>ONLY</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1 }}>15 DAYS</div>
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>rent as<br />brokerage</div>
        </div>
      )}

      {/* logo */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 420, height: 92, boxSizing: "border-box", padding: "22px 40px 0", background: "#fff" }}>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 34, lineHeight: 1, color: NAVY, letterSpacing: -0.5 }}>
          pronesto<span style={{ color: GOLD }}>.</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#4A5578", marginTop: 8 }}>PROP-TECH SEARCH ENGINE</div>
      </div>

      {/* title block */}
      <div style={{ position: "absolute", left: 0, top: 92, width: 420, height: 380, boxSizing: "border-box", padding: "34px 40px 0", background: NAVY, color: "#fff", borderBottomRightRadius: 28 }}>
        <div style={{ display: "inline-block", background: GOLD, color: INK, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, padding: "6px 14px", borderRadius: 999 }}>
          {isRent ? "READY TO MOVE" : "PROPERTY FOR SALE"}
        </div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 40, lineHeight: 1.05, marginTop: 14, letterSpacing: 2 }}>PREMIUM</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: d.bedrooms != null ? 56 : 40, lineHeight: 1.05, textTransform: "uppercase" }}>
          {d.bedrooms != null ? `${d.bedrooms} BHK ${label(d.propertyType).split(" ")[0]}` : label(d.propertyType)}
        </div>
        <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 54, lineHeight: 1.05, color: GOLD }}>{isRent ? "For Rent" : "For Sale"}</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6, lineHeight: 1.4 }}>📍 {place}</div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8, borderTop: "1px solid rgba(255,255,255,.35)", paddingTop: 10, width: 340, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: GOLD }}>{isRent ? "RENT" : "PRICE"}</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 32, lineHeight: 1 }}>{inr(d.price)}</div>
          {isRent && <div style={{ fontSize: 13, fontWeight: 500 }}>/ month</div>}
        </div>
      </div>

      {/* key stats */}
      <div style={{ position: "absolute", left: 40, top: 530, width: 714, display: "grid", gridTemplateColumns: `repeat(${Math.max(stats.length, 1)}, minmax(0, 1fr))`, gap: 12 }}>
        {stats.map((s) => (
          <div key={s.k} style={{ height: 66, background: "#EEF1FA", borderRadius: 14, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 14px" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, lineHeight: 1.1 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "#3E4868" }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* extra photos */}
      <div style={{ position: "absolute", left: 40, top: 614, display: "flex", gap: 16 }}>
        {[img2, img3].map((src, i) =>
          src ? (
            <div key={i} style={{ width: 162, height: 224, borderRadius: 81, overflow: "hidden", background: "#E6EAF7", boxShadow: "0 6px 16px rgba(15,23,51,.15)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: 162, height: 224, objectFit: "cover", display: "block" }} />
            </div>
          ) : null
        )}
      </div>

      {/* details */}
      {details.length > 0 && (
        <div style={{ position: "absolute", left: 404, top: 612, width: 350 }}>
          <SectionTitle>FLAT DETAILS</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0, 1fr)", rowGap: 6, columnGap: 10, fontSize: 13, lineHeight: 1.35, marginTop: 8 }}>
            {details.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <div style={{ fontWeight: 700 }}>{k}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* amenities */}
      {d.amenities.length > 0 && (
        <div style={{ position: "absolute", left: 404, top: 754, width: 350 }}>
          <SectionTitle>AMENITIES</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {d.amenities.slice(0, 8).map((a) => (
              <div key={a} style={{ background: NAVY, color: "#fff", borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>
                {a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* nearby */}
      {d.nearby.length > 0 && (
        <div style={{ position: "absolute", left: 40, top: 856, width: 714 }}>
          <SectionTitle>NEARBY &amp; CONNECTIVITY</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 24, rowGap: 7, marginTop: 10, fontSize: 12, lineHeight: 1.35 }}>
            {d.nearby.slice(0, 8).map((n) => (
              <div key={n}>• {n}</div>
            ))}
          </div>
        </div>
      )}

      {/* footer contact */}
      <div style={{ position: "absolute", left: 380, top: 1000, width: 414, height: 123, background: NAVY, color: "#fff", boxSizing: "border-box", padding: "0 40px 0 112px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 25, letterSpacing: 0.5 }}>{d.agent.phone ? `+91-${d.agent.phone.replace(/\D/g, "").slice(-10)}` : "Call today"}</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Call / WhatsApp today</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>www.pronesto.in</div>
      </div>

      {/* footer partner */}
      <div style={{ position: "absolute", left: 0, top: 1000, width: 476, height: 123, background: "#0F1733", color: "#fff", borderTopRightRadius: 80, boxSizing: "border-box", padding: "0 40px", display: "flex", alignItems: "center", zIndex: 2 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: GOLD }}>YOUR CHANNEL PARTNER</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 24, lineHeight: 1.1 }}>{d.agent.name}</div>
          {d.agent.code && <div style={{ fontSize: 13, fontWeight: 500 }}>Partner Code: {d.agent.code}</div>}
        </div>
      </div>
    </div>
  );
}
