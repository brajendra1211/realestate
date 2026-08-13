"use client";

import { useState, type ChangeEvent } from "react";
import { IMAGE_CATEGORIES, IMAGE_CATEGORY_LABELS } from "@/lib/format";
import { parseAmenitiesString } from "@/lib/amenities";
import { LocationFields } from "@/components/LocationFields";

type ImageItem = { url: string; category: string };

type PropertyFormValues = {
  id?: string;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: string;
  condition: "NEW_BOOKING" | "RESALE" | null;
  price: number;
  priceNegotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  city: string;
  locality: string | null;
  address: string | null;
  amenities: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  images: ImageItem[];
  brochureUrl?: string | null;
  youtubeUrl?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  localityId?: string | null;
  projectId?: string | null;
};

const PROPERTY_TYPES = [
  "APARTMENT",
  "VILLA",
  "INDEPENDENT_HOUSE",
  "PLOT",
  "COMMERCIAL",
  "OFFICE",
];

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
  amenityOptions,
  listAsOptions,
  allowManualCoordinates,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Partial<PropertyFormValues>;
  submitLabel: string;
  amenityOptions: { id: string; name: string }[];
  listAsOptions?: { id: string; label: string }[];
  allowManualCoordinates?: boolean;
}) {
  const [images, setImages] = useState<ImageItem[]>(defaultValues?.images ?? []);
  const selectedAmenities = parseAmenitiesString(defaultValues?.amenities ?? null);
  const [listingType, setListingType] = useState<"SALE" | "RENT">(defaultValues?.listingType ?? "SALE");
  const [pendingCategory, setPendingCategory] = useState<string>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(defaultValues?.brochureUrl ?? null);
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [brochureError, setBrochureError] = useState<string | null>(null);

  async function handleBrochureFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBrochureUploading(true);
    setBrochureError(null);

    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/upload/document", { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await response.json();
      setBrochureUrl(data.url);
    } catch (error) {
      setBrochureError(error instanceof Error ? error.message : "Upload failed");
    }

    setBrochureUploading(false);
    event.target.value = "";
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const data = await response.json();
        setImages((prev) => [...prev, { url: data.url, category: pendingCategory }]);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      }
    }

    setUploading(false);
    event.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((image) => image.url !== url));
  }

  function updateImageCategory(url: string, category: string) {
    setImages((prev) => prev.map((image) => (image.url === url ? { ...image, category } : image)));
  }

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      {brochureUrl && <input type="hidden" name="brochureUrl" value={brochureUrl} />}

      {listAsOptions && listAsOptions.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <label className="text-sm font-medium text-blue-900">List this property as</label>
          <select
            name="onBehalfOfUserId"
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Myself</option>
            {listAsOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-blue-700">
            Choose a dealer or owner account to list this property on their behalf. Leave as
            &quot;Myself&quot; to list it under your own account.
          </p>
        </div>
      )}

      {images.map((image) => (
        <input key={`url-${image.url}`} type="hidden" name="imageUrls" value={image.url} />
      ))}
      {images.map((image) => (
        <input
          key={`category-${image.url}`}
          type="hidden"
          name="imageCategories"
          value={image.category}
        />
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={defaultValues?.title}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Listing type</label>
          <select
            name="listingType"
            value={listingType}
            onChange={(event) => setListingType(event.target.value as "SALE" | "RENT")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="SALE">For Sale</option>
            <option value="RENT">For Rent</option>
          </select>
        </div>

        {listingType === "SALE" && (
          <div>
            <label className="text-sm font-medium text-slate-700">New or resale?</label>
            <select
              name="condition"
              defaultValue={defaultValues?.condition ?? "RESALE"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="NEW_BOOKING">New Booking</option>
              <option value="RESALE">Resale</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700">Property type</label>
          <select
            name="propertyType"
            defaultValue={defaultValues?.propertyType ?? "APARTMENT"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Price (INR)</label>
          <input
            type="number"
            name="price"
            required
            min={0}
            defaultValue={defaultValues?.price}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="priceNegotiable"
            id="priceNegotiable"
            defaultChecked={defaultValues?.priceNegotiable}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="priceNegotiable" className="text-sm text-slate-700">
            Price negotiable
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Bedrooms</label>
          <input
            type="number"
            name="bedrooms"
            min={0}
            defaultValue={defaultValues?.bedrooms ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Bathrooms</label>
          <input
            type="number"
            name="bathrooms"
            min={0}
            defaultValue={defaultValues?.bathrooms ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Area (sqft)</label>
          <input
            type="number"
            name="areaSqft"
            min={0}
            defaultValue={defaultValues?.areaSqft ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <LocationFields
          defaultCountryId={defaultValues?.countryId ?? undefined}
          defaultStateId={defaultValues?.stateId ?? undefined}
          defaultCityId={defaultValues?.cityId ?? undefined}
          defaultCityName={defaultValues?.city}
          defaultLocalityId={defaultValues?.localityId ?? undefined}
          defaultLocalityName={defaultValues?.locality ?? undefined}
          defaultProjectId={defaultValues?.projectId ?? undefined}
          excludePropertyId={defaultValues?.id}
          allowManualCoordinates={allowManualCoordinates}
        />

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Address</label>
          <input
            type="text"
            name="address"
            defaultValue={defaultValues?.address ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            defaultValue={defaultValues?.description}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Amenities</label>
          {amenityOptions.length === 0 ? (
            <p className="mt-1 text-xs text-slate-400">
              No amenities set up yet — add some from the admin Amenities page.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenityOptions.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity.name}
                    defaultChecked={selectedAmenities.some(
                      (name) => name.toLowerCase() === amenity.name.toLowerCase()
                    )}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {amenity.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact name</label>
          <input
            type="text"
            name="contactName"
            defaultValue={defaultValues?.contactName ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact phone</label>
          <input
            type="text"
            name="contactPhone"
            defaultValue={defaultValues?.contactPhone ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact email</label>
          <input
            type="email"
            name="contactEmail"
            defaultValue={defaultValues?.contactEmail ?? undefined}
            suppressHydrationWarning
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">YouTube video link</label>
          <input
            type="url"
            name="youtubeUrl"
            placeholder="https://www.youtube.com/watch?v=..."
            defaultValue={defaultValues?.youtubeUrl ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Optional — shown as an embedded video on the listing page.</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Brochure (PDF)</label>
        <p className="mt-1 text-xs text-slate-500">
          Upload a PDF brochure — buyers will see a download button on the listing page.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleBrochureFile}
            disabled={brochureUploading}
            className="block text-sm"
          />
          {brochureUploading && <p className="text-xs text-slate-500">Uploading…</p>}
        </div>
        {brochureError && <p className="mt-1 text-xs text-red-600">{brochureError}</p>}
        {brochureUrl && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <a href={brochureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View uploaded brochure
            </a>
            <button
              type="button"
              onClick={() => setBrochureUrl(null)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Photos</label>
        <p className="mt-1 text-xs text-slate-500">
          Pick the room/area these photos are of, then upload — add more batches for other rooms.
          You can change a photo&apos;s tag any time below.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={pendingCategory}
            onChange={(event) => setPendingCategory(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {IMAGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {IMAGE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFiles}
            disabled={uploading}
            className="block text-sm"
          />
        </div>
        {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((image) => (
              <div key={image.url} className="w-28">
                <div className="relative h-24 w-28 overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(image.url)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
                <select
                  value={image.category}
                  onChange={(event) => updateImageCategory(image.url, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                >
                  {IMAGE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {IMAGE_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
