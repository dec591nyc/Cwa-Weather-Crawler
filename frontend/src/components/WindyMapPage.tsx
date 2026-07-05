import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  formatMetricValue,
  getAirQualityMetricValue,
  getMetricColor,
  getMetricLegendItems,
  getWeatherMetricValue,
  metricConfigs,
} from "../lib/colorScale.ts";
import type { GeoJsonFeature, ObservationMetric, Pm25Observation } from "../types/weather.ts";

type WindyStatus = "idle" | "loading" | "ready" | "error";

interface WindyApi {
  map: any;
}

interface WindyMapPageProps {
  features: GeoJsonFeature[];
  pm25Observations: Pm25Observation[];
  selectedCounty: string;
  activeMetric: ObservationMetric;
  metricMin: number;
  isActive: boolean;
}

declare global {
  interface Window {
    windyInit?: (options: Record<string, unknown>, callback: (api: WindyApi) => void) => void;
    L?: any;
    __leafletLoaderPromise?: Promise<void>;
    __windyLoaderPromise?: Promise<void>;
  }
}

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.css";
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
const WINDY_SCRIPT_URL = "https://api.windy.com/assets/map-forecast/libBoot.js";
const WINDY_INIT_TIMEOUT_MS = 15000;

function loadStyleOnce(href: string): void {
  const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScriptOnce(src: string, label: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`${label} failed to load`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`${label} failed to load`));
    document.head.appendChild(script);
  });
}

function waitForWindyInit(timeoutMs = WINDY_INIT_TIMEOUT_MS): Promise<void> {
  if (window.windyInit) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (window.windyInit) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(
          new Error(
            "Windy library loaded, but windyInit was not registered. Check Windy key domain authorization, browser blockers, console network errors, and Leaflet CSS/JS loading."
          )
        );
        return;
      }

      window.setTimeout(check, 50);
    };

    check();
  });
}

function loadLeafletScript(): Promise<void> {
  loadStyleOnce(LEAFLET_CSS_URL);

  if (window.L) {
    return Promise.resolve();
  }
  if (window.__leafletLoaderPromise) {
    return window.__leafletLoaderPromise;
  }

  window.__leafletLoaderPromise = loadScriptOnce(LEAFLET_SCRIPT_URL, "Leaflet library").then(() => {
    if (!window.L) {
      throw new Error("Leaflet library loaded, but window.L was not registered");
    }
  });

  return window.__leafletLoaderPromise;
}

async function loadWindyScript(): Promise<void> {
  if (window.windyInit) {
    return Promise.resolve();
  }
  if (window.__windyLoaderPromise) {
    return window.__windyLoaderPromise;
  }

  window.__windyLoaderPromise = loadLeafletScript()
    .then(() => loadScriptOnce(WINDY_SCRIPT_URL, "Windy library"))
    .then(() => waitForWindyInit());

  return window.__windyLoaderPromise;
}

function observedText(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const WindyMapPage: React.FC<WindyMapPageProps> = ({
  features,
  pm25Observations,
  selectedCounty,
  activeMetric,
  metricMin,
  isActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<any>(null);
  const windyApiRef = useRef<WindyApi | null>(null);
  const [status, setStatus] = useState<WindyStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [weatherCount, setWeatherCount] = useState<number>(0);
  const [airQualityCount, setAirQualityCount] = useState<number>(0);

  const renderMarkers = useCallback((api: WindyApi) => {
    const L = window.L;
    if (!L || !api.map) {
      setStatus("error");
      setMessage("Leaflet map is unavailable from Windy");
      return;
    }

    if (markerLayerRef.current) {
      markerLayerRef.current.remove();
    }

    const layer = L.layerGroup().addTo(api.map);
    markerLayerRef.current = layer;
    const config = metricConfigs[activeMetric];

    if (config.source === "airQuality") {
      const rows = pm25Observations
        .filter((obs) => obs.lat !== null && obs.lon !== null)
        .filter((obs) => !selectedCounty || obs.county === selectedCounty)
        .map((obs) => ({ obs, value: getAirQualityMetricValue(obs, activeMetric) }))
        .filter(({ value }) => value !== null && value >= metricMin);

      setWeatherCount(0);
      setAirQualityCount(rows.length);

      for (const { obs, value } of rows) {
        const marker = L.circleMarker([obs.lat, obs.lon], {
          radius: 7,
          color: "#111827",
          weight: 1.2,
          fillColor: getMetricColor(activeMetric, value),
          fillOpacity: 0.82,
        });

        marker.bindPopup(`
          <div class="windy-popup">
            <strong>${obs.station_name || "-"}</strong>
            <span>${obs.county || ""} · 環境部空品觀測</span>
            <div class="popup-metric-large">${config.label} ${formatMetricValue(activeMetric, value)}</div>
            <dl>
              <dt>AQI</dt><dd>${obs.aqi ?? "-"}</dd>
              <dt>狀態</dt><dd>${obs.status ?? "-"}</dd>
              <dt>PM2.5</dt><dd>${obs.pm25 ?? "-"}</dd>
              <dt>PM10</dt><dd>${obs.pm10 ?? "-"}</dd>
              <dt>時間</dt><dd>${observedText(obs.observed_at || obs.fetched_at)}</dd>
            </dl>
          </div>
        `);
        marker.addTo(layer);
      }
      return;
    }

    const rows = features
      .filter((feature) => !selectedCounty || feature.properties.county === selectedCounty)
      .map((feature) => ({
        feature,
        value: getWeatherMetricValue(feature.properties, activeMetric),
      }))
      .filter(({ value }) => value !== null && value >= metricMin);

    setWeatherCount(rows.length);
    setAirQualityCount(0);

    for (const { feature, value } of rows) {
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;
      const marker = L.circleMarker([lat, lon], {
        radius: 6,
        color: "#ffffff",
        weight: 1.3,
        fillColor: getMetricColor(activeMetric, value),
        fillOpacity: 0.9,
      });

      marker.bindPopup(`
        <div class="windy-popup">
          <strong>${props.station_name || "-"}</strong>
          <span>${props.county || ""} ${props.town || ""} · 中央氣象署即時觀測</span>
          <div class="popup-metric-large">${config.label} ${formatMetricValue(activeMetric, value)}</div>
          <dl>
            <dt>氣溫</dt><dd>${props.temperature ?? "-"} °C</dd>
            <dt>10 分鐘降雨量</dt><dd>${props.rainfall_10min ?? 0} mm</dd>
            <dt>當天累積雨量</dt><dd>${props.rainfall_today ?? 0} mm</dd>
            <dt>濕度</dt><dd>${props.humidity ?? "-"}%</dd>
            <dt>風速</dt><dd>${props.wind_speed ?? "-"} m/s</dd>
            <dt>能見度</dt><dd>${props.visibility_description || props.visibility_km || "-"}</dd>
            <dt>時間</dt><dd>${observedText(props.observed_at || props.fetched_at)}</dd>
          </dl>
        </div>
      `);
      marker.addTo(layer);
    }
  }, [activeMetric, features, metricMin, pm25Observations, selectedCounty]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const key = import.meta.env.VITE_WINDY_API_KEY as string | undefined;
      if (!key) {
        setStatus("error");
        setMessage("Missing VITE_WINDY_API_KEY");
        return;
      }

      try {
        setStatus("loading");
        await loadWindyScript();
        if (cancelled) return;

        const windyInit = window.windyInit;
        if (!windyInit) {
          throw new Error("Windy init function is unavailable after loader completed");
        }

        windyInit(
          {
            key,
            lat: 23.7,
            lon: 121,
            zoom: 7,
            overlay: "wind",
          },
          (api: WindyApi) => {
            if (cancelled) return;
            windyApiRef.current = api;
            if (api.map?.setView) {
              api.map.setView([23.7, 121], 7);
            }
            if (api.map?.invalidateSize) {
              window.setTimeout(() => api.map.invalidateSize(), 200);
            }
            setStatus("ready");
            setMessage("");
            renderMarkers(api);
          }
        );
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message || "Windy map failed to initialize");
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (markerLayerRef.current) {
        markerLayerRef.current.remove();
        markerLayerRef.current = null;
      }
      if (windyApiRef.current?.map?.remove) {
        windyApiRef.current.map.remove();
      }
      windyApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !windyApiRef.current) return;
    renderMarkers(windyApiRef.current);
  }, [renderMarkers, status]);

  useEffect(() => {
    if (!isActive || status !== "ready" || !windyApiRef.current?.map?.invalidateSize) return;
    const timeoutId = window.setTimeout(() => {
      windyApiRef.current?.map?.invalidateSize();
    }, 120);
    return () => window.clearTimeout(timeoutId);
  }, [isActive, status]);

  const config = metricConfigs[activeMetric];
  const activeCount = config.source === "airQuality" ? airQualityCount : weatherCount;
  const legendItems = getMetricLegendItems(activeMetric);

  return (
    <div
      className="windy-page"
      aria-label="Windy 風場地圖"
      style={{ width: "100%", height: "100%", minHeight: 0, padding: 0, background: "transparent" }}
    >
      <div
        className="windy-map-shell"
        style={{ width: "100%", height: "100%", minHeight: 0, border: 0, borderRadius: 0 }}
      >
        <div id="windy" ref={containerRef} style={{ width: "100%", height: "100%" }} />
        <div className="windy-status-panel">
          <div className={`status-dot ${status === "error" ? "stale" : ""}`} />
          <span>{status === "ready" ? "Windy ready" : status === "loading" ? "Loading Windy" : status}</span>
          {message && <strong>{message}</strong>}
          <small>{config.label} {activeCount} 筆</small>
        </div>
        <div
          aria-label="Windy visual legend"
          style={{
            position: "absolute",
            right: "1rem",
            bottom: "1rem",
            zIndex: 1200,
            display: "grid",
            gap: "0.42rem",
            width: 220,
            border: "1px solid rgba(15, 23, 42, 0.16)",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.94)",
            padding: "0.72rem",
            boxShadow: "0 10px 22px rgba(15, 23, 42, 0.18)",
            fontSize: "0.76rem",
            fontWeight: 800,
          }}
        >
          <strong style={{ fontSize: "0.86rem" }}>{config.label} 顏色級距</strong>
          {legendItems.map((item) => (
            <div
              key={`${activeMetric}-${item.label}`}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  background: item.color,
                }}
              />
              <span>{item.label}</span>
              <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
