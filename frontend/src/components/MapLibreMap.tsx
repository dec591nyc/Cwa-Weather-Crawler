import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import {
  formatMetricValue,
  getMapLibreColorExpression,
  getMetricColor,
  getPm25MetricValue,
  getWeatherMetricValue,
  metricConfigs,
} from "../lib/colorScale.ts";
import type { GeoJsonFeature, ObservationMetric, Pm25Observation } from "../types/weather.ts";

interface MapLibreMapProps {
  features: GeoJsonFeature[];
  pm25Observations: Pm25Observation[];
  selectedCounty: string;
  activeMetric: ObservationMetric;
  metricMin: number;
}

interface ObservationState {
  features: GeoJsonFeature[];
  pm25Observations: Pm25Observation[];
  selectedCounty: string;
  activeMetric: ObservationMetric;
  metricMin: number;
}

const osmRasterStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm-raster",
    },
  ],
};

function buildObservationFeatures(state: ObservationState): GeoJSON.FeatureCollection {
  const config = metricConfigs[state.activeMetric];

  if (config.source === "airQuality") {
    const features = state.pm25Observations
      .filter((obs) => obs.lat !== null && obs.lon !== null)
      .filter((obs) => !state.selectedCounty || obs.county === state.selectedCounty)
      .map((obs) => {
        const value = getPm25MetricValue(obs);
        return { obs, value };
      })
      .filter(({ value }) => value !== null && value >= state.metricMin)
      .map(({ obs, value }) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [obs.lon as number, obs.lat as number],
        },
        properties: {
          sourceType: "airQuality",
          station_name: obs.station_name || "-",
          county: obs.county || "",
          town: "",
          value,
          displayValue: formatMetricValue(state.activeMetric, value),
          color: getMetricColor(state.activeMetric, value),
          metricLabel: config.label,
          metricUnit: config.unit,
          observed_at: obs.observed_at,
          fetched_at: obs.fetched_at,
          pm25: obs.pm25,
          pm25_avg: obs.pm25_avg,
        },
      }));

    return { type: "FeatureCollection", features };
  }

  const features = state.features
    .filter((feature) => !state.selectedCounty || feature.properties.county === state.selectedCounty)
    .map((feature) => {
      const value = getWeatherMetricValue(feature.properties, state.activeMetric);
      return { feature, value };
    })
    .filter(({ value }) => value !== null && value >= state.metricMin)
    .map(({ feature, value }) => ({
      type: "Feature" as const,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        sourceType: "weather",
        value,
        displayValue: formatMetricValue(state.activeMetric, value),
        color: getMetricColor(state.activeMetric, value),
        metricLabel: config.label,
        metricUnit: config.unit,
      },
    }));

  return { type: "FeatureCollection", features };
}

function popupHtml(props: Record<string, any>): string {
  const sourceLabel = props.sourceType === "airQuality" ? "環境部空品觀測" : "中央氣象署即時觀測";
  const observedAt = props.observed_at || props.fetched_at;
  const observedText = observedAt ? new Date(observedAt).toLocaleString() : "-";

  if (props.sourceType === "airQuality") {
    return `
      <div class="popup-container">
        <div class="popup-header">
          <div class="popup-station-name">${props.station_name || "-"}</div>
          <div class="popup-location-sub">${props.county || ""} · ${sourceLabel}</div>
        </div>
        <div class="popup-metric-large">${props.displayValue || "-"}</div>
        <div class="popup-grid">
          <span class="popup-label">PM2.5</span>
          <span class="popup-value">${props.pm25 ?? "-"}</span>
          <span class="popup-label">PM2.5 平均</span>
          <span class="popup-value">${props.pm25_avg ?? "-"}</span>
        </div>
        <div class="popup-time">觀測時間: ${observedText}</div>
      </div>
    `;
  }

  return `
    <div class="popup-container">
      <div class="popup-header">
        <div class="popup-station-name">${props.station_name || "-"}</div>
        <div class="popup-location-sub">${props.county || ""} ${props.town || ""} · ${sourceLabel}</div>
      </div>
      <div class="popup-metric-large">${props.metricLabel || "觀測"} ${props.displayValue || "-"}</div>
      <div class="popup-grid">
        <span class="popup-label">氣溫</span>
        <span class="popup-value">${props.temperature ?? "-"} °C</span>
        <span class="popup-label">降水量</span>
        <span class="popup-value">${props.rainfall ?? "-"} mm</span>
        <span class="popup-label">濕度</span>
        <span class="popup-value">${props.humidity ?? "-"}%</span>
        <span class="popup-label">風速</span>
        <span class="popup-value">${props.wind_speed ?? "-"} m/s</span>
        <span class="popup-label">風向</span>
        <span class="popup-value">${props.wind_direction ?? "-"}</span>
      </div>
      <div class="popup-time">觀測時間: ${observedText}</div>
    </div>
  `;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  features,
  pm25Observations,
  selectedCounty,
  activeMetric,
  metricMin,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stateRef = useRef<ObservationState>({
    features,
    pm25Observations,
    selectedCounty,
    activeMetric,
    metricMin,
  });

  stateRef.current = {
    features,
    pm25Observations,
    selectedCounty,
    activeMetric,
    metricMin,
  };

  const updateObservationData = () => {
    const map = mapRef.current;
    const source = map?.getSource("observation-source") as maplibregl.GeoJSONSource | undefined;
    if (!map || !source) return;

    const state = stateRef.current;
    source.setData(buildObservationFeatures(state));

    if (map.getLayer("observation-circles")) {
      map.setPaintProperty(
        "observation-circles",
        "circle-color",
        getMapLibreColorExpression(state.activeMetric) as any
      );
      map.setPaintProperty(
        "observation-circles",
        "circle-radius",
        7
      );
    }
  };

  const ensureObservationLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource("observation-source")) {
      map.addSource("observation-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer("observation-circles")) {
      map.addLayer({
        id: "observation-circles",
        type: "circle",
        source: "observation-source",
        paint: {
          "circle-radius": 7,
          "circle-color": getMapLibreColorExpression(stateRef.current.activeMetric) as any,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });
    }

    updateObservationData();
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmRasterStyle,
      center: [121.0, 23.7],
      zoom: 7.2,
      maxZoom: 12,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");

    map.on("load", ensureObservationLayers);
    map.on("style.load", ensureObservationLayers);

    map.on("click", "observation-circles", (event) => {
      if (!event.features || event.features.length === 0) return;
      const feature = event.features[0];
      const geometry = feature.geometry as GeoJSON.Point;
      const coordinates = geometry.coordinates.slice() as [number, number];

      new maplibregl.Popup({ className: "custom-mapbox-popup" })
        .setLngLat(coordinates)
        .setHTML(popupHtml(feature.properties || {}))
        .addTo(map);
    });

    map.on("mouseenter", "observation-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "observation-circles", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    ensureObservationLayers();
    updateObservationData();
  }, [features, pm25Observations, selectedCounty, activeMetric, metricMin]);

  return (
    <div className="map-pane">
      <div ref={mapContainerRef} id="map" />
    </div>
  );
};
