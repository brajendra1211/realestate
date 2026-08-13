"use client";

import { useState, type ChangeEvent } from "react";

export function DocumentUploadField({
  name,
  label,
  helpText,
  defaultUrl = null,
}: {
  name: string;
  label: string;
  helpText?: string;
  defaultUrl?: string | null;
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
      const response = await fetch("/api/upload/document", { method: "POST", body });
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

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          disabled={uploading}
          className="block text-sm"
        />
        {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {url && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View uploaded file
          </a>
          <button type="button" onClick={() => setUrl(null)} className="text-xs text-red-600 hover:underline">
            Remove
          </button>
        </div>
      )}
      {url && <input type="hidden" name={name} value={url} />}
    </div>
  );
}
