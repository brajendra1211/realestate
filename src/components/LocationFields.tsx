"use client";

import { useEffect, useState } from "react";
import { formatPrice, PROPERTY_TYPE_LABELS } from "@/lib/format";
import { LocationCombobox } from "@/components/LocationCombobox";

type Option = { id: string; name: string };
type ProjectOption = { id: string; name: string; slug: string; status: string };
type NearbyProperty = {
  id: string;
  title: string;
  slug: string;
  listingType: "SALE" | "RENT";
  propertyType: string;
  price: number;
  projectId: string | null;
};

type IdTagged<T> = { parentId: string; options: T };
type ListingsTagged = { key: string; projects: ProjectOption[]; properties: NearbyProperty[] };

const selectClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

export function LocationFields({
  defaultCountryId,
  defaultStateId,
  defaultCityId,
  defaultCityName,
  defaultLocalityId,
  defaultLocalityName,
  defaultProjectId,
  excludePropertyId,
  allowManualCoordinates,
}: {
  defaultCountryId?: string;
  defaultStateId?: string;
  defaultCityId?: string;
  defaultCityName?: string;
  defaultLocalityId?: string;
  defaultLocalityName?: string;
  defaultProjectId?: string;
  excludePropertyId?: string;
  allowManualCoordinates?: boolean;
}) {
  const [countries, setCountries] = useState<Option[]>([]);
  const [countryId, setCountryId] = useState(defaultCountryId ?? "");

  const [statesCache, setStatesCache] = useState<IdTagged<Option[]> | null>(null);
  const [stateId, setStateId] = useState(defaultStateId ?? "");

  const [citiesCache, setCitiesCache] = useState<IdTagged<Option[]> | null>(null);
  const [cityId, setCityId] = useState(defaultCityId ?? "");
  const [cityName, setCityName] = useState(defaultCityName ?? "");

  const [localitiesCache, setLocalitiesCache] = useState<IdTagged<Option[]> | null>(null);
  const [localityId, setLocalityId] = useState(defaultLocalityId ?? "");
  const [localityName, setLocalityName] = useState(defaultLocalityName ?? "");
  const [newLocalityName, setNewLocalityName] = useState("");
  const [newLocalityDraft, setNewLocalityDraft] = useState("");
  const [newLocalityLatitude, setNewLocalityLatitude] = useState("");
  const [newLocalityLongitude, setNewLocalityLongitude] = useState("");

  const [listingsCache, setListingsCache] = useState<ListingsTagged | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");

  // Derive the currently-visible options from cache tagged by the parent id
  // that produced them — this avoids stale lists from an in-flight fetch for
  // a since-abandoned selection, and needs no separate "loading" state.
  const states = statesCache?.parentId === countryId ? statesCache.options : [];
  const loadingStates = countryId !== "" && statesCache?.parentId !== countryId;

  const cities = citiesCache?.parentId === stateId ? citiesCache.options : [];
  const loadingCities = stateId !== "" && citiesCache?.parentId !== stateId;

  const localities = localitiesCache?.parentId === cityId ? localitiesCache.options : [];
  const loadingLocalities = cityId !== "" && localitiesCache?.parentId !== cityId;

  const listingsKey = cityId ? `${cityId}:${localityId}` : "";
  const projects = listingsCache?.key === listingsKey ? listingsCache.projects : [];
  const nearbyProperties = listingsCache?.key === listingsKey ? listingsCache.properties : [];
  const loadingListings = listingsKey !== "" && listingsCache?.key !== listingsKey;

  // Load countries once.
  useEffect(() => {
    fetch("/api/geo/countries")
      .then((res) => res.json())
      .then((data: Option[]) => setCountries(data));
  }, []);

  // Load states when country changes.
  useEffect(() => {
    if (!countryId) return;
    fetch(`/api/geo/states?countryId=${countryId}`)
      .then((res) => res.json())
      .then((data: Option[]) => setStatesCache({ parentId: countryId, options: data }));
  }, [countryId]);

  // Load cities when state changes.
  useEffect(() => {
    if (!stateId) return;
    fetch(`/api/geo/cities?stateId=${stateId}`)
      .then((res) => res.json())
      .then((data: Option[]) => setCitiesCache({ parentId: stateId, options: data }));
  }, [stateId]);

  // Load localities when city changes.
  useEffect(() => {
    if (!cityId) return;
    fetch(`/api/geo/localities?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data: Option[]) => setLocalitiesCache({ parentId: cityId, options: data }));
  }, [cityId]);

  // Load matching projects + properties once a city is picked.
  useEffect(() => {
    if (!listingsKey) return;
    const params = new URLSearchParams({ cityId });
    if (localityId) params.set("localityId", localityId);
    if (excludePropertyId) params.set("excludeId", excludePropertyId);
    fetch(`/api/geo/location-listings?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { projects: ProjectOption[]; properties: NearbyProperty[] }) => {
        setListingsCache({ key: listingsKey, projects: data.projects ?? [], properties: data.properties ?? [] });
      });
  }, [listingsKey, cityId, localityId, excludePropertyId]);

  return (
    <div className="sm:col-span-2 space-y-4 rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-700">Location</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-slate-500">Country</label>
          <select
            value={countryId}
            required
            onChange={(event) => {
              setCountryId(event.target.value);
              setStateId("");
              setCityId("");
              setCityName("");
              setLocalityId("");
              setLocalityName("");
              setNewLocalityName("");
              setNewLocalityDraft("");
              setNewLocalityLatitude("");
              setNewLocalityLongitude("");
              setProjectId("");
            }}
            className={selectClass}
          >
            <option value="" disabled>
              Select a country
            </option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">State</label>
          <select
            value={stateId}
            required
            disabled={!countryId || loadingStates || states.length === 0}
            onChange={(event) => {
              setStateId(event.target.value);
              setCityId("");
              setCityName("");
              setLocalityId("");
              setLocalityName("");
              setNewLocalityName("");
              setNewLocalityDraft("");
              setNewLocalityLatitude("");
              setNewLocalityLongitude("");
              setProjectId("");
            }}
            className={selectClass}
          >
            <option value="" disabled>
              {loadingStates ? "Loading…" : states.length === 0 ? "No states yet" : "Select a state"}
            </option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <LocationCombobox
          label="City"
          required
          options={cities}
          loading={loadingCities}
          disabled={!stateId}
          selectedLabel={cityName}
          placeholder={loadingCities ? "Loading…" : "Select city"}
          searchPlaceholder="Select city"
          emptyMessage="No cities here yet — ask an admin to add it."
          onSelect={(city) => {
            setCityId(city.id);
            setCityName(city.name);
            setLocalityId("");
            setLocalityName("");
            setNewLocalityName("");
            setNewLocalityDraft("");
            setNewLocalityLatitude("");
            setNewLocalityLongitude("");
            setProjectId("");
          }}
        />

        <LocationCombobox
          label="Locality"
          options={localities}
          loading={loadingLocalities}
          disabled={!cityId}
          selectedLabel={localityId ? localityName : ""}
          placeholder={loadingLocalities ? "Loading…" : "Select locality"}
          emptyMessage="No localities listed yet — add yours below."
          clearLabel="Any locality"
          onClear={() => {
            setLocalityId("");
            setLocalityName("");
            setNewLocalityName("");
            setNewLocalityDraft("");
            setNewLocalityLatitude("");
            setNewLocalityLongitude("");
          }}
          onSelect={(locality) => {
            setLocalityId(locality.id);
            setLocalityName(locality.name);
            setNewLocalityName("");
            setNewLocalityDraft("");
            setNewLocalityLatitude("");
            setNewLocalityLongitude("");
            setProjectId("");
          }}
        />
      </div>

      {cityId && (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-3">
          {newLocalityName ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-700">
                  Adding new locality: <span className="font-semibold">“{newLocalityName}”</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewLocalityDraft(newLocalityName);
                    setNewLocalityName("");
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>
              {allowManualCoordinates ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newLocalityLatitude}
                      onChange={(event) => setNewLocalityLatitude(event.target.value)}
                      placeholder="e.g. 28.5355"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newLocalityLongitude}
                      onChange={(event) => setNewLocalityLongitude(event.target.value)}
                      placeholder="e.g. 77.3910"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="col-span-2 text-xs text-slate-400">
                    Optional — leave blank to auto-detect the coordinates.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Its map location will be auto-detected.</p>
              )}
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-slate-600">
                Can&apos;t find your locality above? Type it here and add it — your listing won&apos;t
                be held up waiting for it to be reviewed.
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={newLocalityDraft}
                  onChange={(event) => setNewLocalityDraft(event.target.value)}
                  placeholder="e.g. Gaur City 2"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!newLocalityDraft.trim()}
                  onClick={() => {
                    const trimmed = newLocalityDraft.trim();
                    if (!trimmed) return;
                    setNewLocalityName(trimmed);
                    setLocalityId("");
                    setLocalityName("");
                    setProjectId("");
                  }}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {cityId && (
        <div>
          <label className="text-xs font-medium text-slate-500">Part of a project?</label>
          <select
            value={projectId}
            disabled={loadingListings}
            onChange={(event) => setProjectId(event.target.value)}
            className={selectClass}
          >
            <option value="">This is an independent property (no project)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && !loadingListings && (
            <p className="mt-1 text-xs text-slate-400">
              No registered projects at this location yet — leave as independent.
            </p>
          )}
        </div>
      )}

      {cityId && nearbyProperties.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500">
            Existing listings in this location ({nearbyProperties.length})
          </p>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
            {nearbyProperties.map((property) => (
              <li key={property.id} className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  {property.title}{" "}
                  <span className="text-slate-400">
                    ({PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType})
                  </span>
                </span>
                <span className="font-medium text-slate-700">
                  {formatPrice(property.price, property.listingType)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" name="city" value={cityName} />
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="locality" value={localityName} />
      <input type="hidden" name="newLocalityName" value={newLocalityName} />
      <input type="hidden" name="newLocalityLatitude" value={newLocalityLatitude} />
      <input type="hidden" name="newLocalityLongitude" value={newLocalityLongitude} />
      <input type="hidden" name="projectId" value={projectId} />
    </div>
  );
}
