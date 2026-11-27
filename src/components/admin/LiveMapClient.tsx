"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { AgentPresence, LiveMapData } from "@/lib/liveMap";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const POLL_MS = 20000;
const LINES_SOURCE_ID = "live-map-visit-lines";

function relativeTime(iso: string | null) {
  if (!iso) return "never reported";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const PRESENCE_COLOR: Record<AgentPresence, string> = {
  online: "#16a34a",
  recent: "#d97706",
  offline: "#94a3b8",
};
const PRESENCE_LABEL: Record<AgentPresence, string> = {
  online: "Online now",
  recent: "Recently online",
  offline: "Shop location",
};

function agentMarkerEl(presence: AgentPresence) {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
  el.style.background = PRESENCE_COLOR[presence];
  return el;
}

function visitMarkerEl() {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "3px";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
  el.style.background = "#2563eb";
  return el;
}

export function LiveMapClient({ initialData }: { initialData: LiveMapData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const agentMarkers = useRef(new Map<string, mapboxgl.Marker>());
  const visitMarkers = useRef(new Map<string, mapboxgl.Marker>());
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);

  // Poll for fresh positions — the live-location pings (src/app/api/location,
  // every ~60s per person) bump the User model's live-refresh counter, which
  // would make LiveRefresh reload the whole page on every single person's
  // ping across the platform. A dedicated short poll avoids that entirely.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/live-map", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const fresh = (await res.json()) as LiveMapData;
        if (!stopped) setData(fresh);
      } catch {
        /* try again next tick */
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      // Standard Satellite: real satellite imagery + automatic 3D building
      // extrusion, so admins can actually see the building a visit is at.
      style: "mapbox://styles/mapbox/standard-satellite",
      center: [77.2, 28.6],
      zoom: 10,
      pitch: 45,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(LINES_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: LINES_SOURCE_ID,
        type: "line",
        source: LINES_SOURCE_ID,
        paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 2] },
      });
      setReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const seenAgents = new Set<string>();

    for (const agent of data.agents) {
      if (agent.latitude == null || agent.longitude == null) continue;
      seenAgents.add(agent.id);
      const lngLat: [number, number] = [agent.longitude, agent.latitude];

      const existing = agentMarkers.current.get(agent.id);
      const popupHtml = `
        <div style="font-size:13px;min-width:160px">
          <div style="font-weight:600">${agent.name}</div>
          ${agent.shopName ? `<div>${agent.shopName}</div>` : ""}
          ${agent.agentCode ? `<div style="color:#64748b">Code: ${agent.agentCode}</div>` : ""}
          ${agent.phone ? `<div style="color:#64748b">${agent.phone}</div>` : ""}
          <div style="margin-top:4px;color:${PRESENCE_COLOR[agent.presence]}">
            ${PRESENCE_LABEL[agent.presence]} · ${relativeTime(agent.lastSeenAt)}
          </div>
        </div>`;

      if (existing) {
        existing.setLngLat(lngLat);
        existing.getPopup()?.setHTML(popupHtml);
        existing.getElement().style.background = PRESENCE_COLOR[agent.presence];
      } else {
        const marker = new mapboxgl.Marker({ element: agentMarkerEl(agent.presence) })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(popupHtml))
          .addTo(map);
        agentMarkers.current.set(agent.id, marker);
      }
    }
    for (const [id, marker] of agentMarkers.current) {
      if (!seenAgents.has(id)) {
        marker.remove();
        agentMarkers.current.delete(id);
      }
    }

    const seenVisits = new Set<string>();
    const lineFeatures: GeoJSON.Feature[] = [];
    for (const visit of data.visits) {
      seenVisits.add(visit.id);
      const lngLat: [number, number] = [visit.propertyLongitude, visit.propertyLatitude];

      const scheduled = new Date(visit.scheduledAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const popupHtml = `
        <div style="font-size:13px;min-width:180px">
          <div style="font-weight:600">${visit.propertyLabel || "Visit"}</div>
          <div>Buyer: ${visit.buyerName}${visit.buyerPhone ? ` · ${visit.buyerPhone}` : ""}</div>
          <div>Agent: ${visit.agentName}</div>
          <div style="color:#64748b">${scheduled}</div>
          ${visit.distanceKm != null ? `<div style="margin-top:4px;font-weight:600;color:#2563eb">${visit.distanceKm} km from agent</div>` : ""}
        </div>`;

      const existing = visitMarkers.current.get(visit.id);
      if (existing) {
        existing.getPopup()?.setHTML(popupHtml);
      } else {
        const marker = new mapboxgl.Marker({ element: visitMarkerEl() })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(popupHtml))
          .addTo(map);
        visitMarkers.current.set(visit.id, marker);
      }

      const agent = data.agents.find((a) => a.id === visit.agentId);
      if (agent?.latitude != null && agent?.longitude != null) {
        lineFeatures.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [agent.longitude, agent.latitude],
              [visit.propertyLongitude, visit.propertyLatitude],
            ],
          },
        });
      }
    }
    for (const [id, marker] of visitMarkers.current) {
      if (!seenVisits.has(id)) {
        marker.remove();
        visitMarkers.current.delete(id);
      }
    }

    const source = map.getSource(LINES_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: lineFeatures });
  }, [data, ready]);

  // Fit bounds exactly once, after the very first data load.
  const didFitRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || didFitRef.current) return;
    const points = [
      ...data.agents.filter((a) => a.latitude != null && a.longitude != null).map((a) => [a.longitude!, a.latitude!] as [number, number]),
      ...data.visits.map((v) => [v.propertyLongitude, v.propertyLatitude] as [number, number]),
    ];
    if (points.length === 0) return;
    didFitRef.current = true;
    const bounds = points.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(points[0], points[0]));
    // 3D building extrusions on standard-satellite only render at closer
    // zoom (~16+) — a looser maxZoom here would fit everything in but leave
    // buildings looking flat.
    map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 0 });
  }, [data, ready]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-50 p-8 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">Live map isn&apos;t configured yet.</p>
        <p>Add a Mapbox access token as NEXT_PUBLIC_MAPBOX_TOKEN to enable it.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-600 shadow">
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Agent — online now</div>
        <div className="mt-1 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Agent — recently online</div>
        <div className="mt-1 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Agent — shop location</div>
        <div className="mt-1 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Scheduled visit</div>
      </div>
    </div>
  );
}
