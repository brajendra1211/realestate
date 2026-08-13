"use client";

import { useEffect, useState } from "react";

type Option = { id: string; name: string };

const selectClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

export function GeoCascadeFields({
  countries,
  mode,
}: {
  countries: Option[];
  mode: "state" | "city" | "locality";
}) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [states, setStates] = useState<Option[]>([]);
  const [stateId, setStateId] = useState("");
  const [loadingStates, setLoadingStates] = useState(false);
  const [cities, setCities] = useState<Option[]>([]);
  const [cityId, setCityId] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);

  const needsState = mode === "city" || mode === "locality";
  const needsCity = mode === "locality";

  useEffect(() => {
    if (!needsState || !countryId) {
      setStates([]);
      setStateId("");
      return;
    }
    setLoadingStates(true);
    setStateId("");
    fetch(`/api/admin/geo/states?countryId=${countryId}`)
      .then((res) => res.json())
      .then((data: Option[]) => {
        setStates(data);
        setStateId(data[0]?.id ?? "");
      })
      .finally(() => setLoadingStates(false));
  }, [countryId, needsState]);

  useEffect(() => {
    if (!needsCity || !stateId) {
      setCities([]);
      setCityId("");
      return;
    }
    setLoadingCities(true);
    setCityId("");
    fetch(`/api/admin/geo/cities?stateId=${stateId}`)
      .then((res) => res.json())
      .then((data: Option[]) => {
        setCities(data);
        setCityId(data[0]?.id ?? "");
      })
      .finally(() => setLoadingCities(false));
  }, [stateId, needsCity]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="text-sm font-medium text-slate-700">Country</label>
        <select
          name={mode === "state" ? "countryId" : undefined}
          value={countryId}
          required
          onChange={(event) => setCountryId(event.target.value)}
          className={selectClass}
        >
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {needsState && (
        <div>
          <label className="text-sm font-medium text-slate-700">State</label>
          <select
            name={mode === "city" ? "stateId" : undefined}
            value={stateId}
            required
            disabled={loadingStates || states.length === 0}
            onChange={(event) => setStateId(event.target.value)}
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
      )}

      {needsCity && (
        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <select
            name="cityId"
            value={cityId}
            required
            disabled={loadingCities || cities.length === 0}
            onChange={(event) => setCityId(event.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              {loadingCities ? "Loading…" : cities.length === 0 ? "No cities yet" : "Select a city"}
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
