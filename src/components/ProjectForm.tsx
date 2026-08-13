"use client";

import { useState, type ChangeEvent } from "react";
import { parseAmenitiesString } from "@/lib/amenities";

type ImageItem = { url: string };

type ProjectFormValues = {
  id?: string;
  developerId: string;
  name: string;
  description: string;
  status: "UPCOMING" | "UNDER_CONSTRUCTION" | "READY_TO_MOVE";
  city: string;
  locality: string | null;
  address: string | null;
  priceMin: number | null;
  priceMax: number | null;
  possessionDate: string | null;
  amenities: string | null;
  reraNumber: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ImageItem[];
};

export function ProjectForm({
  action,
  developerId,
  defaultValues,
  submitLabel,
  amenityOptions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  developerId: string;
  defaultValues?: Partial<ProjectFormValues>;
  submitLabel: string;
  amenityOptions: { id: string; name: string }[];
}) {
  const [images, setImages] = useState<ImageItem[]>(defaultValues?.images ?? []);
  const selectedAmenities = parseAmenitiesString(defaultValues?.amenities ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        setImages((prev) => [...prev, { url: data.url }]);
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

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="developerId" value={developerId} />
      {images.map((image) => (
        <input key={image.url} type="hidden" name="images" value={image.url} />
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Project name</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "UPCOMING"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="UPCOMING">Upcoming</option>
            <option value="UNDER_CONSTRUCTION">Under Construction</option>
            <option value="READY_TO_MOVE">Ready to Move</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Possession date</label>
          <input
            type="date"
            name="possessionDate"
            defaultValue={defaultValues?.possessionDate ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <input
            type="text"
            name="city"
            required
            defaultValue={defaultValues?.city}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Locality</label>
          <input
            type="text"
            name="locality"
            defaultValue={defaultValues?.locality ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Address</label>
          <input
            type="text"
            name="address"
            defaultValue={defaultValues?.address ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Price from (INR)</label>
          <input
            type="number"
            name="priceMin"
            min={0}
            defaultValue={defaultValues?.priceMin ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Price to (INR)</label>
          <input
            type="number"
            name="priceMax"
            min={0}
            defaultValue={defaultValues?.priceMax ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">RERA registration number</label>
          <input
            type="text"
            name="reraNumber"
            placeholder="e.g. PRM/KA/RERA/1251/…"
            defaultValue={defaultValues?.reraNumber ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Leave blank if this project isn&apos;t RERA-registered yet.
          </p>
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
          <label className="text-sm font-medium text-slate-700">SEO meta title</label>
          <input
            type="text"
            name="metaTitle"
            defaultValue={defaultValues?.metaTitle ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">SEO meta description</label>
          <input
            type="text"
            name="metaDescription"
            defaultValue={defaultValues?.metaDescription ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Photos</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFiles}
          disabled={uploading}
          className="mt-1 block text-sm"
        />
        {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((image) => (
              <div key={image.url} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200">
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
