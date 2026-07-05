import React, { useEffect, useRef, useState } from "react";

type WindyStatus = "idle" | "loading" | "ready" | "error";

interface WindyApi {
  map: any;
}

declare global {
  interface Window {
    windyInit?: (options: Record<string, unknown>, callback: (api: WindyApi) => void) => void;
    L?: any;
    __leafletLoaderPromise?: Promise<void>;
    __windyLoaderPromise?: Promise<void>;
    __windyApi?: WindyApi;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
const WINDY_SCRIPT_URL = "https://api.windy.com/assets/map-forecast/libBoot.js";
const WINDY_INIT_TIMEOUT_MS = 15000;

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
            "Windy library loaded, but windyInit was not registered. Check the Windy key domain authorization, browser blockers, console network errors, or Leaflet loading."
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

function weatherColor(temp: number | null): string {
  if (temp === null || Number.isNaN(temp)) return "#64748b";
  if (temp >= 32) return "#dc2626";
  if (temp >= 28) return "#f97316";
  if (temp >= 24) return "#facc15";
  if (temp >= 18) return "#22c55e";
  return "#2563eb";
}

function pm25Color(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#64748b";
  if (value > 35) return "#dc2626";
  if (value > 25) return "#f97316";
  if (value > 15) return "#facc15";
  return "#16a34a";
}

export const WindyMapPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<any>(null);
  const [status, setStatus] = useState<WindyStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [weatherCount, setWeatherCount] = useState<number>(0);
  const [pm25Count, setPm25Count] = useState<number>(0);

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

        const mountWindy = (api: WindyApi) => {
          window.__windyApi = api;
          setStatus("ready");
          setMessage("");
          void renderMarkers(api).catch((error: any) => {
            setStatus("error");
            setMessage(error?.message || "Windy markers failed to render");
          });
        };

        if (window.__windyApi) {
          mountWindy(window.__windyApi);
          return;
        }

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
            product: "ecmwf",
          },
          mountWindy
        );
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message || "Windy map failed to initialize");
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderMarkers = async (api: WindyApi) => {
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

    const [weatherRes, pm25Res] = await Promise.all([
      fetch(apiUrl("/api/weather/stations.geojson")),
      fetch(apiUrl("/api/pm25/latest")),
    ]);
    if (!weatherRes.ok) throw new Error("Failed to load weather stations");
    if (!pm25Res.ok) throw new Error("Failed to load PM2.5 stations");

    const weatherData = await weatherRes.json();
    const pm25Data = await pm25Res.json();
    const weatherFeatures = weatherData.features || [];
    const pm25Observations = pm25Data.observations || [];

    setWeatherCount(weatherFeatures.length);
    setPm25Count(pm25Observations.length);

    for (const feature of weatherFeatures) {
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;
      const temp = props.temperature === null ? null : Number(props.temperature);
      const marker = L.circleMarker([lat, lon], {
        radius: 5,
        color: "#ffffff",
        weight: 1,
        fillColor: weatherColor(temp),
        fillOpacity: 0.88,
      });
      marker.bindPopup(`
        <div class="windy-popup">
          <strong>${props.station_name || "-"}</strong>
          <span>${props.county || ""} ${props.town || ""}</span>
          <dl>
            <dt>氣溫</dt><dd>${temp === null ? "-" : `${temp.toFixed(1)} °C`}</dd>
            <dt>降水</dt><dd>${props.rainfall ?? "-"} mm</dd>
            <dt>風速</dt><dd>${props.wind_speed ?? "-"} m/s</dd>
            <dt>濕度</dt><dd>${props.humidity ?? "-"}%</dd>
            <dt>時間</dt><dd>${props.observed_at || "-"}</dd>
          </dl>
        </div>
      `);
      marker.addTo(layer);
    }

    for (const obs of pm25Observations) {
      if (obs.lat === null || obs.lon === null) continue;
      const pm25 = obs.pm25 === null ? null : Number(obs.pm25);
      const marker = L.circleMarker([obs.lat, obs.lon], {
        radius: 7,
        color: "#111827",
        weight: 1,
        fillColor: pm25Color(pm25),
        fillOpacity: 0.72,
      });
      marker.bindPopup(`
        <div class="windy-popup">
          <strong>${obs.station_name || "-"}</strong>
          <span>${obs.county || ""}</span>
          <dl>
            <dt>PM2.5</dt><dd>${pm25 === null ? "-" : pm25}</dd>
            <dt>PM2.5_AVG</dt><dd>${obs.pm25_avg ?? "-"}</dd>
            <dt>時間</dt><dd>${obs.observed_at || "-"}</dd>
          </dl>
        </div>
      `);
      marker.addTo(layer);
    }
  };

  return (
    <main className="windy-page" aria-label="Windy 風場地圖">
      <div className="windy-map-shell">
        <div id="windy" ref={containerRef} />
        <div className="windy-status-panel">
          <div className={`status-dot ${status === "error" ? "stale" : ""}`} />
          <span>{status === "ready" ? "Windy ready" : status === "loading" ? "Loading Windy" : status}</span>
          {message && <strong>{message}</strong>}
          <small>CWA {weatherCount} / PM2.5 {pm25Count}</small>
        </div>
      </div>
    </main>
  );
};
