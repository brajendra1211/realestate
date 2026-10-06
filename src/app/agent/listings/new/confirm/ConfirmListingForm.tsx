"use client";

import { useActionState, useEffect, useState } from "react";
import { submitAgentListing, type SubmitAgentListingState } from "./actions";
import { AgentListingImagesField } from "@/components/agent/AgentListingImagesField";

const initialState: SubmitAgentListingState = {};

const PROPERTY_TYPES = ["APARTMENT", "VILLA", "INDEPENDENT_HOUSE", "PLOT", "COMMERCIAL", "OFFICE"];

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in the title, description, exact address, and a valid price.",
  noLocation: "Location could not be determined — go back and search again.",
  notPrime: "Activate your Prime plan before listing properties.",
};

type Candidate = {
  id: string;
  masterId: string;
  locality: string | null;
  city: string;
  distanceKm: number;
};

// Forced hard navigation via window.location instead of relying on the
// Server Action's built-in redirect() — see src/app/login/LoginForm.tsx.
export function ConfirmListingForm({
  city,
  locality,
  address,
  latitude,
  longitude,
  candidates,
}: {
  city: string;
  locality?: string;
  address?: string;
  latitude: number;
  longitude: number;
  candidates: Candidate[];
}) {
  const [state, formAction, pending] = useActionState(submitAgentListing, initialState);
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);

  function addVideoField() {
    setVideoUrls((prev) => [...prev, ""]);
  }

  function removeVideoField(index: number) {
    setVideoUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  }

  function updateVideoUrl(index: number, value: string) {
    setVideoUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="locality" value={locality ?? ""} />
      <input type="hidden" name="latitude" value={String(latitude)} />
      <input type="hidden" name="longitude" value={String(longitude)} />

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      {candidates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {candidates.length} existing {candidates.length === 1 ? "property" : "properties"} found
            within 200m
          </p>
          <div className="mt-2 space-y-2">
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex items-center gap-2 text-sm text-amber-900">
                <input type="radio" name="masterPropertyId" value={candidate.id} />
                <span className="font-mono">{candidate.masterId}</span>
                <span className="text-amber-700">
                  · {candidate.locality ?? candidate.city} · {Math.round(candidate.distanceKm * 1000)}m
                  away
                </span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-amber-900">
              <input type="radio" name="masterPropertyId" value="" defaultChecked />
              <span>None of these — this is a different property</span>
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-slate-700">
          Exact address <span className="font-normal text-slate-400">(hidden from customers until unlocked)</span>
        </label>
        <textarea
          name="exactAddress"
          required
          rows={2}
          defaultValue={address}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            type="text"
            name="title"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Listing type</label>
          <select
            name="listingType"
            defaultValue="SALE"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="SALE">Sale</option>
            <option value="RENT">Rent</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Property type</label>
          <select
            name="propertyType"
            defaultValue="APARTMENT"
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
          <label className="text-sm font-medium text-slate-700">Price (₹)</label>
          <input
            type="number"
            name="price"
            required
            min={1}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Area (sqft)</label>
          <input
            type="number"
            name="areaSqft"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bedrooms</label>
          <input
            type="number"
            name="bedrooms"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bathrooms</label>
          <input
            type="number"
            name="bathrooms"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Amenities (comma-separated)</label>
          <input
            type="text"
            name="amenities"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-800">Video tour URLs (optional)</label>
              <p className="text-xs text-slate-500">
                Add multiple YouTube (videos, shorts), Vimeo, or video tour links.
              </p>
            </div>
            <button
              type="button"
              onClick={addVideoField}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              + Add another link
            </button>
          </div>

          <div className="space-y-2">
            {videoUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder={`Video URL #${idx + 1} (e.g. https://youtube.com/...)`}
                  value={url}
                  onChange={(e) => updateVideoUrl(idx, e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {videoUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVideoField(idx)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Remove this video link"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <input
            type="hidden"
            name="videoUrl"
            value={videoUrls.map((u) => u.trim()).filter(Boolean).join("\n")}
          />
        </div>
      </div>

      <AgentListingImagesField name="imageUrls" />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}
