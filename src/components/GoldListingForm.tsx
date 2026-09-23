"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentListingImagesField } from "@/components/agent/AgentListingImagesField";
import { submitGoldListingAction, verifyGoldListingPaymentAction, type GoldListingFormInput } from "@/app/list-property/gold/actions";
import type { CreateGoldListingInput } from "@/lib/goldListing";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load payment checkout."));
    document.body.appendChild(script);
  });
}

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export function GoldListingForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const imageUrls = data.getAll("imageUrls").map(String).filter(Boolean);

    const formInput: GoldListingFormInput = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      listingType: String(data.get("listingType") ?? "SALE") as CreateGoldListingInput["listingType"],
      propertyType: String(data.get("propertyType") ?? "APARTMENT") as CreateGoldListingInput["propertyType"],
      bedrooms: data.get("bedrooms") ? Number(data.get("bedrooms")) : null,
      bathrooms: data.get("bathrooms") ? Number(data.get("bathrooms")) : null,
      areaSqft: data.get("areaSqft") ? Number(data.get("areaSqft")) : null,
      price: Number(data.get("price")),
      city: String(data.get("city") ?? ""),
      locality: String(data.get("locality") ?? ""),
      address: String(data.get("address") ?? ""),
      amenities: String(data.get("amenities") ?? ""),
      videoUrl: String(data.get("videoUrl") ?? ""),
      referredByAgentCode: String(data.get("referredByAgentCode") ?? ""),
      images: imageUrls,
    };

    try {
      const result = await submitGoldListingAction(formInput);

      if (result.simulated) {
        router.push(`/list-property/gold/submitted?slug=${result.slug}`);
        return;
      }

      await loadCheckoutScript();
      const razorpay = new window.Razorpay!({
        key: result.keyId,
        amount: result.order.amount,
        currency: result.order.currency,
        order_id: result.order.id,
        name: "BayaEstate",
        description: "Gold Membership self-listing",
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const { slug } = await verifyGoldListingPaymentAction(
              result.input,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            router.push(`/list-property/gold/submitted?slug=${slug}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setStatus("idle");
          }
        },
        modal: { ondismiss: () => setStatus("idle") },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="text-sm font-medium text-slate-700">Title</label>
        <input type="text" name="title" required className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea name="description" required rows={3} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Transaction type</label>
          <select name="listingType" defaultValue="SALE" className={inputClass}>
            <option value="SALE">Sale</option>
            <option value="RENT">Rent</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Property type</label>
          <select name="propertyType" defaultValue="APARTMENT" className={inputClass}>
            {["APARTMENT", "VILLA", "INDEPENDENT_HOUSE", "PLOT", "COMMERCIAL", "OFFICE"].map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Bedrooms</label>
          <input type="number" name="bedrooms" min={0} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bathrooms</label>
          <input type="number" name="bathrooms" min={0} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Area (sqft)</label>
          <input type="number" name="areaSqft" min={0} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Price expectation (₹)</label>
        <input type="number" name="price" min={1} required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <input type="text" name="city" required className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Locality (optional)</label>
          <input type="text" name="locality" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Full address</label>
        <textarea name="address" required rows={2} className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Amenities (comma-separated, optional)</label>
        <input type="text" name="amenities" className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Video tour URL (optional)</label>
        <input type="url" name="videoUrl" placeholder="https://youtube.com/..." className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Referred by Agent Code (optional)</label>
        <input type="text" name="referredByAgentCode" placeholder="AGT-DEL-1024" className={inputClass} />
        <p className="mt-1 text-xs text-slate-400">
          If an agent referred you, they&apos;ll earn 50% of the ₹500 fee instantly.
        </p>
      </div>

      <AgentListingImagesField name="imageUrls" endpoint="/api/gold-listings/upload-image" />

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Processing…" : "Pay ₹500 & submit for review"}
      </button>
    </form>
  );
}
