"use client";

import { useState, type ChangeEvent } from "react";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

// Client-side downscale before upload, purely to cut upload bytes — sharp on
// the server (saveAgentListingImage) remains the authoritative final processor
// (fixed 1280x720 crop + watermark), this is just a bandwidth optimization.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export function AgentListingImagesField({
  name = "imageUrls",
  endpoint = "/api/agent/listings/upload-image",
}: {
  name?: string;
  endpoint?: string;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file);
        const body = new FormData();
        body.append("file", compressed);
        const response = await fetch(endpoint, { method: "POST", body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const data = await response.json();
        setImages((prev) => [...prev, data.url]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    setUploading(false);
    event.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((image) => image !== url));
  }

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Photos</label>
      <p className="mt-1 text-xs text-slate-500">
        Compressed, cropped to 1280×720, and watermarked automatically.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFiles}
          disabled={uploading}
          className="block text-sm"
        />
        {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ×
              </button>
              <input type="hidden" name={name} value={url} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
