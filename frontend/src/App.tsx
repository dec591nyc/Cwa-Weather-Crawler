import React, { useEffect, useMemo, useState } from "react";
import { LayerControl } from "./components/LayerControl.tsx";
import { MapLibreMap } from "./components/MapLibreMap.tsx";
import { Legend } from "./components/Legend.tsx";
import { CountySummaryPanel } from "./components/CountySummaryPanel.tsx";
import { WindyMapPage } from "./components/WindyMapPage.tsx";
import { metricConfigs } from "./lib/colorScale.ts";
import type {
  ApiSource,
  ApiSourcesResponse,
  CountySummary,
  CountySummaryResponse,
  GeoJsonCollection,
  GeoJsonFeature,
  HealthResponse,
  ObservationMetric,
  Pm25Observation,
} from "./types/weather.ts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
const GITHUB_URL = "https://github.com/dec591nyc/CWA-GeoMap_Monitor";
const COUNTY_SORT_ORDER = [
  "基隆市",
  "臺北市",
  "新北市",
  "桃園市",
  "新竹縣",
  "新竹市",
  "苗栗縣",
  "臺中市",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義縣",
  "嘉義市",
  "臺南市",
  "高雄市",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "臺東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];
const COUNTY_SORT_INDEX = new Map<string, number>(
  COUNTY_SORT_ORDER.flatMap((county, index): Array<[string, number]> => [
    [county, index],
    [county.replace("臺", "台"), index],
  ])
);

type AppPage = "dashboard" | "windy";

function formatDateTime(value: string | null): string {
  if (!value) return "尚未取得";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  const parsed = values
    .map((value) => {
      if (!value) return null;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? null : { value, time };
    })
    .filter((item): item is { value: string; time: number } => item !== null);

  if (!parsed.length) return null;
  return parsed.sort((a, b) => b.time - a.time)[0].value;
}

function sortCounties(counties: string[]): string[] {
  return Array.from(new Set(counties.filter(Boolean))).sort((a, b) => {
    const aIndex = COUNTY_SORT_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = COUNTY_SORT_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b, "zh-Hant-TW");
  });
}

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const [windyMounted, setWindyMounted] = useState<boolean>(false);
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [pm25Observations, setPm25Observations] = useState<Pm25Observation[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [countySummaries, setCountySummaries] = useState<CountySummary[]>([]);
  const [apiSources, setApiSources] = useState<ApiSource[]>([]);

  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [activeMetric, setActiveMetric] = useState<ObservationMetric>("temperature");
  const [metricMinByMetric, setMetricMinByMetric] = useState<Record<ObservationMetric, number>>({
    temperature: 0,
    rainfall: 0,
    rainfall_24h: 0,
    humidity: 0,
    wind_speed: 0,
    visibility_km: 0,
    aqi: 0,
    pm25: 0,
  });

  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const metricMin = metricMinByMetric[activeMetric];
  const latestObservedAt = useMemo(
    () =>
      latestTimestamp([
        ...features.map((feature) => feature.properties.observed_at),
        ...pm25Observations.map((obs) => obs.observed_at),
      ]),
    [features, pm25Observations]
  );

  const visibleApiSources = useMemo(() => {
    const active = apiSources.filter((source) => source.status === "active");
    if (active.length) return active;
    const cwa = Array.from(
      new Set(features.map((feature) => feature.properties.source_dataset).filter(Boolean))
    );
    const moenv = Array.from(
      new Set(pm25Observations.map((obs) => obs.source_dataset).filter(Boolean))
    );
    return [
      ...cwa.map((datasetId) => ({ provider: "CWA", dataset_id: datasetId, title: "即時氣象觀測" } as ApiSource)),
      ...moenv.map((datasetId) => ({ provider: "MOENV", dataset_id: datasetId, title: "空氣品質觀測" } as ApiSource)),
    ];
  }, [apiSources, features, pm25Observations]);

  const fetchData = async () => {
    try {
      setError(null);

      const [countiesRes, geojsonRes, pm25Res, healthRes, sourcesRes] = await Promise.all([
        fetch(apiUrl("/api/summary/counties")),
        fetch(apiUrl("/api/weather/stations.geojson")),
        fetch(apiUrl("/api/pm25/latest")),
        fetch(apiUrl("/api/health")),
        fetch(apiUrl("/api/data-sources")),
      ]);

      if (!countiesRes.ok) throw new Error("Failed to load county summaries");
      if (!geojsonRes.ok) throw new Error("Failed to load CWA observations");
      if (!pm25Res.ok) throw new Error("Failed to load air-quality observations");

      const countiesData: CountySummaryResponse = await countiesRes.json();
      const summaries = countiesData.summaries || [];
      setCountySummaries(summaries);
      setCounties(sortCounties(summaries.map((item) => item.county)));

      const geojsonData: GeoJsonCollection = await geojsonRes.json();
      const weatherFeatures = geojsonData.features || [];
      setFeatures(weatherFeatures);

      const pm25Data = await pm25Res.json();
      const pm25Rows = pm25Data.observations || [];
      setPm25Observations(pm25Rows);

      if (healthRes.ok) {
        const healthData: HealthResponse = await healthRes.json();
        if (healthData.latest_fetch) {
          setLastUpdate(healthData.latest_fetch.fetched_at);
        }
      }

      if (sourcesRes.ok) {
        const sourceData: ApiSourcesResponse = await sourcesRes.json();
        setApiSources(sourceData.sources || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const syncLatestObservations = async () => {
    try {
      setSyncWarning(null);
      const refreshRes = await fetch(apiUrl("/api/refresh/observations"), { method: "POST" });
      if (!refreshRes.ok) {
        throw new Error("Observation sync failed");
      }
    } catch (err) {
      console.warn(err);
      setSyncWarning("自動同步失敗，已顯示上一批資料");
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      await syncLatestObservations();
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (activePage === "windy") {
      setWindyMounted(true);
    }
  }, [activePage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncLatestObservations();
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleMetricMinChange = (value: number) => {
    setMetricMinByMetric((current) => ({
      ...current,
      [activeMetric]: value,
    }));
  };

  const handleMetricChange = (metric: ObservationMetric) => {
    setActiveMetric(metric);
    const config = metricConfigs[metric];
    setMetricMinByMetric((current) => ({
      ...current,
      [metric]: current[metric] ?? config.min,
    }));
  };

  const mapLayerStyle = (visible: boolean): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    visibility: visible ? "visible" : "hidden",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    zIndex: visible ? 2 : 1,
  });

  return (
    <>
      <header className="header-bar">
        <div className="header-title-container">
          <span className="header-logo" aria-hidden="true">CWA</span>
          <div>
            <h1 className="header-title">台灣即時氣象與空品觀測</h1>
            <p className="header-subtitle">CWA 觀測、環境部 AQI / PM2.5、OSM / Windy 地圖底圖</p>
            <div className="brand-strip" aria-label="資料與地圖服務">
              <span className="brand-badge brand-cwa">CWA</span>
              <span className="brand-badge brand-moenv">MOENV</span>
              <span className="brand-badge brand-osm">OSM</span>
              <span className="brand-badge brand-windy">Windy</span>
            </div>
          </div>
        </div>

        <div className="header-meta-bar" aria-label="觀測時間與 API 數據來源">
          <div className="api-meta-card">
            <div className="api-meta-time">
              <span>
                <small>觀測時間</small>
                <strong>{formatDateTime(latestObservedAt)}</strong>
              </span>
              <span>
                <small>資料同步</small>
                <strong>{lastUpdate ? formatDateTime(lastUpdate) : "尚未取得同步時間"}</strong>
              </span>
            </div>
            <div className="api-meta-control-panel">
              <span className="api-label">API 數據來源</span>
              <button
                className={`header-refresh-btn ${refreshing ? "loading" : ""}`}
                onClick={handleRefresh}
                disabled={refreshing}
                type="button"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                {refreshing ? "同步中" : "更新觀測資料"}
              </button>
            </div>
            <div className="api-meta-source-panel">
              <div className="api-source-stack">
                {visibleApiSources.map((source) => (
                  <div className="api-source-row" key={`${source.provider}-${source.dataset_id}`}>
                    <span className="api-source-name">{source.provider}</span>
                    <strong>{source.dataset_id}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <nav className="header-nav" aria-label="主要地圖模式">
          <button
            className={`nav-btn ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
            type="button"
          >
            OSM
          </button>
          <button
            className={`nav-btn ${activePage === "windy" ? "active" : ""}`}
            onClick={() => setActivePage("windy")}
            type="button"
          >
            Windy
          </button>
        </nav>

        <div className="header-actions">
          <a
            className="github-btn"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub repository"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.18 1.18A11.1 11.1 0 0 1 12 6.05c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.42.36.79 1.07.79 2.16v3.13c0 .31.21.68.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
              />
            </svg>
            <span>GitHub</span>
          </a>
          <div className="header-status">
            <span className={`status-dot ${error || syncWarning ? "stale" : ""}`} />
            <span>{error ? "API 連線異常" : syncWarning ? "同步警告" : "系統正常"}</span>
          </div>
        </div>
      </header>

      <main className="app-container">
        <section className="map-workspace" aria-label="台灣即時氣象地圖">
          <div className="map-frame">
            <div style={mapLayerStyle(activePage === "dashboard")}>
              {loading ? (
                <div className="map-loading-state">
                  <div className="map-loading-stack">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <div>正在同步並載入最新觀測資料...</div>
                  </div>
                </div>
              ) : (
                <>
                  <MapLibreMap
                    features={features}
                    pm25Observations={pm25Observations}
                    selectedCounty={selectedCounty}
                    activeMetric={activeMetric}
                    metricMin={metricMin}
                  />
                  <Legend metric={activeMetric} />
                </>
              )}
            </div>

            {windyMounted && (
              <div style={mapLayerStyle(activePage === "windy")}>
                <WindyMapPage
                  features={features}
                  pm25Observations={pm25Observations}
                  selectedCounty={selectedCounty}
                  activeMetric={activeMetric}
                  metricMin={metricMin}
                  isActive={activePage === "windy"}
                />
              </div>
            )}
          </div>
        </section>

        <LayerControl
          activeMetric={activeMetric}
          onMetricChange={handleMetricChange}
          metricMin={metricMin}
          onMetricMinChange={handleMetricMinChange}
        />

        <CountySummaryPanel
          summaries={countySummaries}
          counties={counties}
          features={features}
          pm25Observations={pm25Observations}
          selectedCounty={selectedCounty}
          onCountySelect={setSelectedCounty}
          activeMetric={activeMetric}
        />
      </main>
    </>
  );
};

export default App;
