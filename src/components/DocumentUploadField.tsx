"use client";

import { useState, type ChangeEvent } from "react";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

export function DocumentUploadField({
  name,
  label,
  helpText,
  defaultUrl = null,
  required = false,
  endpoint = "/api/upload/document",
}: {
  name: string;
  label: string;
  helpText?: string;
  defaultUrl?: string | null;
  required?: boolean;
  /** Registration passes the public endpoint, since there is no session yet. */
  endpoint?: string;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(endpoint, { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await response.json();
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const isPdf = url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 transition hover:border-brand-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{helpText ?? "PDF, JPG, PNG or WEBP · up to 15 MB"}</p>
        </div>
        {url && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            ✓ Uploaded
          </span>
        )}
      </div>

      {url ? (
        <div className="mt-3 flex items-center gap-3">
          {isPdf ? (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-xs font-bold text-red-600">
              PDF
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-14 w-14 rounded-xl border border-slate-200 object-cover" />
          )}
          <div className="flex gap-3 text-sm">
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">
              View
            </a>
            <button type="button" onClick={() => setUrl(null)} className="font-medium text-red-600 hover:underline">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <input
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-600 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
          />
          {uploading && <p className="mt-2 text-xs text-slate-500">Uploading…</p>}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {url && <input type="hidden" name={name} value={url} />}
      {required && (
        // Hidden proxy so the browser blocks submit until a file is uploaded.
        <input
          type="text"
          required
          readOnly
          tabIndex={-1}
          aria-hidden
          value={url ?? ""}
          onInvalid={(e) => e.currentTarget.setCustomValidity("Please upload this document")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
          className="pointer-events-none h-0 w-full opacity-0"
        />
      )}
    </div>
  );
}
