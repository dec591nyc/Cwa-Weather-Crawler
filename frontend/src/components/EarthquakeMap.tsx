import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { EarthquakeEvent, EarthquakeStation } from "../types/weather.ts";

interface EarthquakeMapProps {
  earthquakes: EarthquakeEvent[];
  selectedEarthquakeKey: string | null;
  onSelectEarthquake?: (earthquakeKey: string) => void;
}

const osmRasterStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: { "osm-raster": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" } },
  layers: [{ id: "osm-raster", type: "raster", source: "osm-raster" }],
};

function intensityLevel(value: string | null | undefined): number {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function epicenterColor(magnitude: number | null): string {
  if (magnitude === null) return "#64748b";
  if (magnitude >= 6) return "#be123c";
  if (magnitude >= 5) return "#f97316";
  if (magnitude >= 4) return "#facc15";
  return "#2563eb";
}

function stationColor(intensity: string | null | undefined): string {
  const level = intensityLevel(intensity);
  if (level >= 5) return "#be123c";
  if (level >= 4) return "#f97316";
  if (level >= 3) return "#facc15";
  if (level >= 2) return "#0ea5e9";
  return "#94a3b8";
}

function getSelectedEarthquake(earthquakes: EarthquakeEvent[], selectedEarthquakeKey: string | null): EarthquakeEvent | null {
  return earthquakes.find((event) => event.earthquake_key === selectedEarthquakeKey) || earthquakes[0] || null;
}

function buildEpicenterFeatures(earthquakes: EarthquakeEvent[], selectedEarthquakeKey: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: earthquakes
      .filter((event) => event.epicenter_lat !== null && event.epicenter_lon !== null)
      .map((event) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [event.epicenter_lon as number, event.epicenter_lat as number] },
        properties: { ...event, color: epicenterColor(event.magnitude_value), selected: event.earthquake_key === selectedEarthquakeKey },
      })),
  };
}

function buildStationFeatures(stations: EarthquakeStation[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations
      .filter((station) => station.station_lat !== null && station.station_lon !== null)
      .map((station) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [station.station_lon as number, station.station_lat as number] },
        properties: { ...station, color: stationColor(station.station_intensity) },
      })),
  };
}

function eventPopup(props: Record<string, any>): string {
  const timeText = props.earthquake_time ? new Date(props.earthquake_time).toLocaleString() : "-";
  return `<div class="popup-container"><div class="popup-header"><div class="popup-station-name">地震震央</div><div class="popup-location-sub">${props.source_dataset || "CWA"}</div></div><div class="popup-metric-large">規模 ${props.magnitude_value ?? "-"}</div><div class="popup-grid"><span class="popup-label">時間</span><span class="popup-value">${timeText}</span><span class="popup-label">深度</span><span class="popup-value">${props.depth_km ?? "-"} km</span><span class="popup-label">位置</span><span class="popup-value">${props.location ?? "-"}</span><span class="popup-label">最大震度</span><span class="popup-value">${props.max_intensity ?? "-"}</span><span class="popup-label">測站數</span><span class="popup-value">${props.station_count ?? 0}</span></div><div class="popup-time">${props.report_content ?? ""}</div></div>`;
}

function stationPopup(props: Record<string, any>): string {
  return `<div class="popup-container"><div class="popup-header"><div class="popup-station-name">${props.station_name || "震度測站"}</div><div class="popup-location-sub">${props.county || props.area_name || ""}</div></div><div class="popup-metric-large">震度 ${props.station_intensity || "-"}</div><div class="popup-grid"><span class="popup-label">距離</span><span class="popup-value">${props.distance_km ?? "-"} km</span><span class="popup-label">PGA</span><span class="popup-value">${props.pga ?? "-"}</span><span class="popup-label">PGV</span><span class="popup-value">${props.pgv ?? "-"}</span></div></div>`;
}

export const EarthquakeMap: React.FC<EarthquakeMapProps> = ({ earthquakes, selectedEarthquakeKey, onSelectEarthquake }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const earthquakesRef = useRef<EarthquakeEvent[]>(earthquakes);
  const selectedKeyRef = useRef<string | null>(selectedEarthquakeKey);
  earthquakesRef.current = earthquakes;
  selectedKeyRef.current = selectedEarthquakeKey;

  const updateData = () => {
    const map = mapRef.current;
    if (!map) return;
    const selectedEarthquake = getSelectedEarthquake(earthquakesRef.current, selectedKeyRef.current);
    const epicenterSource = map.getSource("earthquake-epicenters") as maplibregl.GeoJSONSource | undefined;
    const stationSource = map.getSource("earthquake-stations") as maplibregl.GeoJSONSource | undefined;
    if (epicenterSource) epicenterSource.setData(buildEpicenterFeatures(earthquakesRef.current, selectedEarthquake?.earthquake_key || null));
    if (stationSource) stationSource.setData(buildStationFeatures(selectedEarthquake?.stations || []));
  };

  const flyToSelected = () => {
    const map = mapRef.current;
    const selectedEarthquake = getSelectedEarthquake(earthquakesRef.current, selectedKeyRef.current);
    const lon = selectedEarthquake?.epicenter_lon;
    const lat = selectedEarthquake?.epicenter_lat;
    if (!map || lon === null || lon === undefined || lat === null || lat === undefined) return;
    map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 8.2), essential: true });
  };

  const ensureLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getSource("earthquake-epicenters")) map.addSource("earthquake-epicenters", { type: "geojson", data: buildEpicenterFeatures(earthquakesRef.current, selectedKeyRef.current) });
    if (!map.getSource("earthquake-stations")) map.addSource("earthquake-stations", { type: "geojson", data: buildStationFeatures(getSelectedEarthquake(earthquakesRef.current, selectedKeyRef.current)?.stations || []) });
    if (!map.getLayer("earthquake-stations-layer")) {
      map.addLayer({ id: "earthquake-stations-layer", type: "circle", source: "earthquake-stations", paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1, "circle-opacity": 0.82 } } as any);
    }
    if (!map.getLayer("earthquake-epicenters-layer")) {
      map.addLayer({ id: "earthquake-epicenters-layer", type: "circle", source: "earthquake-epicenters", paint: { "circle-radius": ["case", ["==", ["get", "selected"], true], 20, ["interpolate", ["linear"], ["to-number", ["get", "magnitude_value"]], 3, 8, 5, 13, 6, 18], "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": ["case", ["==", ["get", "selected"], true], 4, 2], "circle-opacity": 0.92 } } as any);
    }
    updateData();
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({ container: mapContainerRef.current, style: osmRasterStyle, center: [121.0, 23.7], zoom: 7.0, maxZoom: 12 });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.on("load", ensureLayers);
    map.on("style.load", ensureLayers);
    map.on("click", "earthquake-epicenters-layer", (event) => {
      if (!event.features || event.features.length === 0) return;
      const feature = event.features[0];
      const geometry = feature.geometry as GeoJSON.Point;
      const props = feature.properties || {};
      if (typeof props.earthquake_key === "string") onSelectEarthquake?.(props.earthquake_key);
      new maplibregl.Popup({ className: "custom-mapbox-popup" }).setLngLat(geometry.coordinates as [number, number]).setHTML(eventPopup(props)).addTo(map);
    });
    map.on("click", "earthquake-stations-layer", (event) => {
      if (!event.features || event.features.length === 0) return;
      const geometry = event.features[0].geometry as GeoJSON.Point;
      new maplibregl.Popup({ className: "custom-mapbox-popup" }).setLngLat(geometry.coordinates as [number, number]).setHTML(stationPopup(event.features[0].properties || {})).addTo(map);
    });
    map.on("mouseenter", "earthquake-epicenters-layer", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "earthquake-epicenters-layer", () => { map.getCanvas().style.cursor = ""; });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { ensureLayers(); updateData(); }, [earthquakes, selectedEarthquakeKey]);
  useEffect(() => { updateData(); flyToSelected(); }, [selectedEarthquakeKey]);
  return <div className="map-pane"><div ref={mapContainerRef} id="earthquake-map" style={{ width: "100%", height: "100%" }} /></div>;
};
