import React, { useEffect, useState } from "react";
import { LayerControl } from "./components/LayerControl.tsx";
import { MapLibreMap } from "./components/MapLibreMap.tsx";
import { Legend } from "./components/Legend.tsx";
import { WindyMapPage } from "./components/WindyMapPage.tsx";
import { metricConfigs } from "./lib/colorScale.ts";
import type {
  GeoJsonCollection,
  GeoJsonFeature,
  HealthResponse,
  ObservationMetric,
  Pm25Observation,
} from "./types/weather.ts";

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<"dashboard" | "windy">("dashboard");
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [pm25Observations, setPm25Observations] = useState<Pm25Observation[]>([]);
  const [counties, setCounties] = useState<string[]>([]);

  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [activeMetric, setActiveMetric] = useState<ObservationMetric>("temperature");
  const [metricMinByMetric, setMetricMinByMetric] = useState<Record<ObservationMetric, number>>({
    temperature: 0,
    rainfall: 0,
    humidity: 0,
    wind_speed: 0,
    pm25: 0,
  });

  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [weatherCount, setWeatherCount] = useState<number | null>(null);
  const [pm25Count, setPm25Count] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const metricMin = metricMinByMetric[activeMetric];

  const fetchData = async () => {
    try {
      setError(null);

      const [countiesRes, geojsonRes, pm25Res, healthRes] = await Promise.all([
        fetch("/api/summary/counties"),
        fetch("/api/weather/stations.geojson"),
        fetch("/api/pm25/latest"),
        fetch("/api/health"),
      ]);

      if (!countiesRes.ok) throw new Error("Failed to load county summaries");
      if (!geojsonRes.ok) throw new Error("Failed to load CWA observations");
      if (!pm25Res.ok) throw new Error("Failed to load PM2.5 observations");

      const countiesData = await countiesRes.json();
      setCounties((countiesData.summaries || []).map((item: { county: string }) => item.county));

      const geojsonData: GeoJsonCollection = await geojsonRes.json();
      const weatherFeatures = geojsonData.features || [];
      setFeatures(weatherFeatures);
      setWeatherCount(weatherFeatures.length);

      const pm25Data = await pm25Res.json();
      const pm25Rows = pm25Data.observations || [];
      setPm25Observations(pm25Rows);
      setPm25Count(pm25Rows.length);

      if (healthRes.ok) {
        const healthData: HealthResponse = await healthRes.json();
        if (healthData.latest_fetch) {
          setLastUpdate(healthData.latest_fetch.fetched_at);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [weatherRes, pm25Res] = await Promise.all([
        fetch("/api/refresh/weather", { method: "POST" }),
        fetch("/api/refresh/pm25", { method: "POST" }),
      ]);

      if (!weatherRes.ok) {
        throw new Error("CWA observation sync failed. Backend server error.");
      }
      if (!pm25Res.ok) {
        console.warn("PM2.5 sync failed. Weather observations were refreshed.");
      }
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to sync latest observations.");
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

  return (
    <>
      <header className="header-bar">
        <div className="header-title-container">
          <span className="header-logo" aria-hidden="true">CWA</span>
          <div>
            <h1 className="header-title">台灣即時氣象與空品觀測</h1>
            <p className="header-subtitle">CWA 觀測、環境部 PM2.5、OSM 地圖底圖</p>
          </div>
        </div>

        <nav className="header-nav" aria-label="Primary navigation">
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
          <div className="header-status">
            <span className={`status-dot ${error ? "stale" : ""}`} />
            <span>{error ? "API 連線異常" : "系統正常"}</span>
          </div>
          <div className="refresh-cluster">
            <button
              className={`header-refresh-btn ${refreshing ? "loading" : ""}`}
              onClick={handleRefresh}
              disabled={refreshing}
              type="button"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {refreshing ? "同步中" : "更新觀測資料"}
            </button>
            <span className="refresh-time">
              {lastUpdate ? `最後更新 ${new Date(lastUpdate).toLocaleString()}` : "尚未取得更新時間"}
            </span>
          </div>
        </div>
      </header>

      {activePage === "windy" ? (
        <WindyMapPage />
      ) : (
        <main className="app-container">
          <section className="map-workspace" aria-label="台灣即時氣象地圖">
            <div className="map-frame">
              {loading ? (
                <div className="map-loading-state">
                  <div className="map-loading-stack">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <div>正在載入地圖與最新觀測資料...</div>
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
          </section>

          <LayerControl
            counties={counties}
            selectedCounty={selectedCounty}
            onCountyChange={setSelectedCounty}
            activeMetric={activeMetric}
            onMetricChange={handleMetricChange}
            metricMin={metricMin}
            onMetricMinChange={handleMetricMinChange}
            weatherCount={weatherCount}
            pm25Count={pm25Count}
          />
        </main>
      )}
    </>
  );
};

export default App;
