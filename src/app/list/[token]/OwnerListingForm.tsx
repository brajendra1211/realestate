"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AgentListingImagesField } from "@/components/agent/AgentListingImagesField";
import { submitOwnerListingAction } from "./actions";

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

const TYPES: [string, string][] = [
  ["APARTMENT", "Flat / Apartment"],
  ["INDEPENDENT_HOUSE", "Independent house / floor"],
  ["VILLA", "Villa"],
  ["PG", "PG / Co-living"],
  ["OFFICE", "Office"],
  ["SHOP", "Shop"],
];

const num = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? Number(v) : null);
const txt = (v: FormDataEntryValue | null) => (String(v ?? "").trim() || null);

export function OwnerListingForm({ token, city }: { token: string; city: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    try {
      const { slug } = await submitOwnerListingAction(token, {
        title: String(d.get("title") ?? ""),
        description: String(d.get("description") ?? ""),
        propertyType: String(d.get("propertyType") ?? "APARTMENT") as "APARTMENT",
        bedrooms: num(d.get("bedrooms")),
        bathrooms: num(d.get("bathrooms")),
        areaSqft: num(d.get("areaSqft")),
        price: Number(d.get("price")),
        securityDeposit: num(d.get("securityDeposit")),
        maintenanceCharges: num(d.get("maintenanceCharges")),
        furnishing: txt(d.get("furnishing")),
        societyName: txt(d.get("societyName")),
        locality: txt(d.get("locality")),
        exactAddress: String(d.get("exactAddress") ?? ""),
        amenities: txt(d.get("amenities")),
        videoUrl: txt(d.get("videoUrl")),
        bachelorFriendly: d.get("bachelorFriendly") === "on",
        images: d.getAll("imageUrls").map(String).filter(Boolean),
      });
      router.push(`/list/${token}/done?slug=${encodeURIComponent(slug)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <label className="block text-sm font-semibold text-slate-700">
        Listing title
        <input name="title" required className={input} placeholder="e.g. 2 BHK flat near metro, Sector 62" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Property type
          <select name="propertyType" defaultValue="APARTMENT" className={input}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Furnishing
          <select name="furnishing" defaultValue="" className={input}>
            <option value="">Not specified</option>
            <option value="UNFURNISHED">Unfurnished</option>
            <option value="SEMI_FURNISHED">Semi-furnished</option>
            <option value="FULLY_FURNISHED">Fully furnished</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Bedrooms (BHK)
          <input name="bedrooms" type="number" min={0} className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Bathrooms
          <input name="bathrooms" type="number" min={0} className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Area (sqft)
          <input name="areaSqft" type="number" min={0} className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Society / project name
          <input name="societyName" className={input} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700">
          Monthly rent (₹)
          <input name="price" type="number" min={1} required className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Security deposit (₹)
          <input name="securityDeposit" type="number" min={0} className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Maintenance (₹/mo)
          <input name="maintenanceCharges" type="number" min={0} className={input} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Locality in {city}
          <input name="locality" className={input} />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
          <input name="bachelorFriendly" type="checkbox" defaultChecked className="h-4 w-4 accent-brand-600" />
          Bachelors welcome
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Full address (kept private until a buyer unlocks it)
        <textarea name="exactAddress" required rows={2} className={input} />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea name="description" required rows={4} className={input} placeholder="Tell tenants what makes your property special" />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        Amenities (comma separated, optional)
        <input name="amenities" className={input} placeholder="Lift, Parking, Power backup" />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        Video link (YouTube, optional)
        <input name="videoUrl" type="url" className={input} />
      </label>

      <AgentListingImagesField name="imageUrls" endpoint="/api/list-request/upload-image" extraFields={{ token }} />

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {busy ? "Submitting…" : "Submit my property"}
      </button>
    </form>
  );
}
