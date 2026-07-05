import React, { useEffect, useMemo, useState } from "react";
import { LayerControl } from "./components/LayerControl.tsx";
import { MapLibreMap } from "./components/MapLibreMap.tsx";
import { Legend } from "./components/Legend.tsx";
import { CountySummaryPanel } from "./components/CountySummaryPanel.tsx";
import { WindyMapPage } from "./components/WindyMapPage.tsx";
import { EarthquakeMap } from "./components/EarthquakeMap.tsx";
import { EarthquakeSummaryPanel } from "./components/EarthquakeSummaryPanel.tsx";
import { metricConfigs } from "./lib/colorScale.ts";
import type { ApiSource, ApiSourcesResponse, CountySummary, CountySummaryResponse, DataLayer, EarthquakeEvent, EarthquakeResponse, GeoJsonCollection, GeoJsonFeature, HealthResponse, ObservationMetric, Pm25Observation, SyncStatusResponse } from "./types/weather.ts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
const GITHUB_URL = "https://github.com/dec591nyc/CWA-GeoMap_Monitor";
const COUNTY_SORT_ORDER = ["基隆市", "臺北市", "新北市", "桃園市", "新竹縣", "新竹市", "苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "嘉義市", "臺南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"];
const COUNTY_SORT_INDEX = new Map<string, number>(COUNTY_SORT_ORDER.flatMap((county, index): Array<[string, number]> => [[county, index], [county.replace("臺", "台"), index]]));
const DATA_API_PROVIDERS = new Set(["CWA", "MOENV"]);

type AppPage = "dashboard" | "windy";
interface SourceGroup { provider: string; sources: ApiSource[]; }

function formatDateTime(value: string | null): string { if (!value) return "尚未取得"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString(); }
function latestTimestamp(values: Array<string | null | undefined>): string | null { const parsed = values.map((value) => { if (!value) return null; const time = new Date(value).getTime(); return Number.isNaN(time) ? null : { value, time }; }).filter((item): item is { value: string; time: number } => item !== null); if (!parsed.length) return null; return parsed.sort((a, b) => b.time - a.time)[0].value; }
function sortCounties(counties: string[]): string[] { return Array.from(new Set(counties.filter(Boolean))).sort((a, b) => { const aIndex = COUNTY_SORT_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER; const bIndex = COUNTY_SORT_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER; if (aIndex !== bIndex) return aIndex - bIndex; return a.localeCompare(b, "zh-Hant-TW"); }); }
function groupApiSources(sources: ApiSource[]): SourceGroup[] { const groups = new Map<string, ApiSource[]>(); for (const source of sources.filter((item) => item.status === "active" && DATA_API_PROVIDERS.has(item.provider))) groups.set(source.provider, [...(groups.get(source.provider) || []), source]); return Array.from(groups.entries()).map(([provider, groupSources]) => ({ provider, sources: groupSources })); }
function formatProviderLabel(provider: string): string { if (provider === "MOENV") return "環境部"; if (provider === "CWA") return "中央氣象署"; return provider; }
function syncLabel(status: SyncStatusResponse | null, fallbackWarning: string | null, error: string | null): string { if (error) return "API 連線異常"; if (!status) return fallbackWarning ? "同步警告" : "系統正常"; if (status.overall_status === "ok") return "全部同步成功"; if (status.overall_status === "warning") return "部分同步異常"; return "核心同步異常"; }
function syncStatusTitle(status: SyncStatusResponse | null): string { if (!status) return "尚未取得同步明細"; return status.sources.map((source) => `${source.provider} ${source.dataset_id} ${source.title}: ${source.status}${source.error_message ? ` - ${source.error_message}` : ""}`).join("\n"); }

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const [activeDataLayer, setActiveDataLayer] = useState<DataLayer>("observations");
  const [windyMounted, setWindyMounted] = useState<boolean>(false);
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [pm25Observations, setPm25Observations] = useState<Pm25Observation[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [countySummaries, setCountySummaries] = useState<CountySummary[]>([]);
  const [apiSources, setApiSources] = useState<ApiSource[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [hoveredSourceProvider, setHoveredSourceProvider] = useState<string | null>(null);
  const [pinnedSourceProvider, setPinnedSourceProvider] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [activeMetric, setActiveMetric] = useState<ObservationMetric>("temperature");
  const [metricMinByMetric, setMetricMinByMetric] = useState<Record<ObservationMetric, number>>({ temperature: 0, rainfall_10min: 0, rainfall_24h: 0, humidity: 0, wind_speed: 0, visibility_km: 0, pm25: 0, pm10: 0, o3_8hr: 0, co_8hr: 0, so2: 0, no2: 0 });
  const [earthquakeMinMagnitude, setEarthquakeMinMagnitude] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const metricMin = metricMinByMetric[activeMetric];
  const filteredEarthquakes = useMemo(() => earthquakes.filter((event) => (event.magnitude_value ?? 0) >= earthquakeMinMagnitude), [earthquakes, earthquakeMinMagnitude]);
  const latestObservedAt = useMemo(() => latestTimestamp([...features.map((feature) => feature.properties.observed_at), ...pm25Observations.map((obs) => obs.observed_at), ...filteredEarthquakes.map((event) => event.earthquake_time)]), [features, pm25Observations, filteredEarthquakes]);
  const visibleApiSources = useMemo(() => { if (apiSources.length) return apiSources.filter((source) => source.status === "active" && DATA_API_PROVIDERS.has(source.provider)); const cwa = Array.from(new Set(features.map((feature) => feature.properties.source_dataset).filter(Boolean))); const moenv = Array.from(new Set(pm25Observations.map((obs) => obs.source_dataset).filter(Boolean))); return [...cwa.map((datasetId) => ({ provider: "CWA", dataset_id: datasetId, title: "即時觀測", category: "current_weather", endpoint: "", status: "active", map_ready: true, coordinate_quality: "測站座標", used_by: ["氣象與雨量觀測"], metrics: [], note: "中央氣象署即時觀測資料來源。" } as ApiSource)), ...moenv.map((datasetId) => ({ provider: "MOENV", dataset_id: datasetId, title: "空氣品質監測即時資料", category: "air_quality", endpoint: "", status: "active", map_ready: true, coordinate_quality: "測站座標", used_by: ["空氣品質觀測"], metrics: [], note: "環境部空氣品質監測資料來源。" } as ApiSource))]; }, [apiSources, features, pm25Observations]);
  const sourceGroups = useMemo(() => groupApiSources(visibleApiSources), [visibleApiSources]);
  const activeSourceGroup = sourceGroups.find((group) => group.provider === (pinnedSourceProvider || hoveredSourceProvider)) || null;
  const syncProblems = syncStatus?.sources.filter((source) => source.status !== "success") || [];
  const currentSyncLabel = syncLabel(syncStatus, syncWarning, error);

  const fetchData = async () => {
    try {
      setError(null);
      const [countiesRes, geojsonRes, pm25Res, earthquakesRes, healthRes, sourcesRes, syncStatusRes] = await Promise.all([fetch(apiUrl("/api/summary/counties")), fetch(apiUrl("/api/weather/stations.geojson")), fetch(apiUrl("/api/pm25/latest")), fetch(apiUrl("/api/earthquakes/latest?limit=100")), fetch(apiUrl("/api/health")), fetch(apiUrl("/api/data-sources")), fetch(apiUrl("/api/sync/status"))]);
      if (!countiesRes.ok) throw new Error("Failed to load county summaries");
      if (!geojsonRes.ok) throw new Error("Failed to load CWA observations");
      if (!pm25Res.ok) throw new Error("Failed to load air-quality observations");
      const countiesData: CountySummaryResponse = await countiesRes.json(); const summaries = countiesData.summaries || []; setCountySummaries(summaries); setCounties(sortCounties(summaries.map((item) => item.county)));
      const geojsonData: GeoJsonCollection = await geojsonRes.json(); setFeatures(geojsonData.features || []);
      const pm25Data = await pm25Res.json(); setPm25Observations(pm25Data.observations || []);
      if (earthquakesRes.ok) { const earthquakeData: EarthquakeResponse = await earthquakesRes.json(); setEarthquakes(earthquakeData.earthquakes || []); }
      if (healthRes.ok) { const healthData: HealthResponse = await healthRes.json(); if (healthData.latest_fetch) setLastUpdate(healthData.latest_fetch.fetched_at); }
      if (sourcesRes.ok) { const sourceData: ApiSourcesResponse = await sourcesRes.json(); setApiSources(sourceData.sources || []); }
      if (syncStatusRes.ok) { const statusData: SyncStatusResponse = await syncStatusRes.json(); setSyncStatus(statusData); setSyncWarning(statusData.overall_status === "ok" ? null : statusData.summary); }
    } catch (err: any) { console.error(err); setError(err.message || "An unexpected error occurred"); } finally { setLoading(false); }
  };
  const syncLatestObservations = async () => { try { setSyncWarning(null); const refreshRes = await fetch(apiUrl("/api/refresh/observations"), { method: "POST" }); if (!refreshRes.ok) throw new Error("Observation sync failed"); const refreshData = await refreshRes.json(); setSyncWarning(refreshData.status === "partial_failed" ? "部分資料來源同步失敗" : null); } catch (err) { console.warn(err); setSyncWarning("自動同步失敗，已顯示上一批資料"); } };
  const loadInitialData = async () => { setLoading(true); setRefreshing(true); try { await syncLatestObservations(); await fetchData(); } finally { setRefreshing(false); } };
  useEffect(() => { void loadInitialData(); }, []);
  useEffect(() => { if (activePage === "windy") setWindyMounted(true); }, [activePage]);
  const handleRefresh = async () => { setRefreshing(true); try { await syncLatestObservations(); await fetchData(); } finally { setRefreshing(false); } };
  const handleMetricMinChange = (value: number) => setMetricMinByMetric((current) => ({ ...current, [activeMetric]: value }));
  const handleMetricChange = (metric: ObservationMetric) => { setActiveMetric(metric); const config = metricConfigs[metric]; setMetricMinByMetric((current) => ({ ...current, [metric]: current[metric] ?? config.min })); };
  const mapLayerStyle = (visible: boolean): React.CSSProperties => ({ position: "absolute", inset: 0, width: "100%", height: "100%", visibility: visible ? "visible" : "hidden", opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", zIndex: visible ? 2 : 1 });

  return <><header className="header-bar"><div className="header-title-container"><span className="header-logo" aria-hidden="true">CWA</span><div><h1 className="header-title">台灣即時氣象、空品與地震觀測</h1><p className="header-subtitle">CWA 觀測、地震震央與環境部污染物指標</p><div className="brand-strip" aria-label="數據 API 來源"><span className="brand-badge brand-cwa">CWA</span><span className="brand-badge brand-moenv">MOENV</span></div></div></div><div className="header-meta-bar" aria-label="觀測時間與 API 數據來源"><div className="api-meta-card"><div className="api-meta-time"><span><small>觀測時間</small><strong>{formatDateTime(latestObservedAt)}</strong></span><span><small>資料同步</small><strong>{lastUpdate ? formatDateTime(lastUpdate) : "尚未取得同步時間"}</strong></span></div><div className="api-meta-control-panel"><span className="api-label">API 數據來源</span><button className={`header-refresh-btn ${refreshing ? "loading" : ""}`} onClick={handleRefresh} disabled={refreshing} type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>{refreshing ? "同步中" : "更新觀測資料"}</button></div><div className="api-meta-source-panel"><div className="api-source-stack" onMouseLeave={() => setHoveredSourceProvider(null)}>{sourceGroups.map((group) => { const pinned = pinnedSourceProvider === group.provider; return <button key={group.provider} type="button" className={`api-source-row ${pinned ? "active" : ""}`} onMouseEnter={() => setHoveredSourceProvider(group.provider)} onClick={() => setPinnedSourceProvider(pinned ? null : group.provider)}><span className="api-source-name">{formatProviderLabel(group.provider)}</span><strong>{group.sources.length}</strong></button>; })}</div>{activeSourceGroup && <div className="api-source-hover-card"><div className="api-source-hover-title">{formatProviderLabel(activeSourceGroup.provider)}資料來源</div><div className="api-source-hover-list">{activeSourceGroup.sources.map((source) => <div key={`${source.provider}-${source.dataset_id}`} className="api-source-hover-item"><strong>{source.dataset_id}｜{source.title}</strong><span>{source.note}</span><small>{source.metrics.join("、")}</small></div>)}</div></div>}</div></div></div><nav className="header-nav" aria-label="主要地圖模式"><button className={`nav-btn ${activePage === "dashboard" ? "active" : ""}`} onClick={() => setActivePage("dashboard")} type="button">OSM</button><button className={`nav-btn ${activePage === "windy" ? "active" : ""}`} onClick={() => setActivePage("windy")} type="button">Windy</button></nav><div className="header-actions"><div className="header-status" title={syncStatusTitle(syncStatus)}><span className={`status-dot ${error || (syncStatus && syncStatus.overall_status !== "ok") || syncWarning ? "stale" : ""}`} /><span>{currentSyncLabel}</span></div><a className="github-btn" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="Open GitHub repository"><span>GitHub</span></a>{syncProblems.length > 0 && <div className="api-source-hover-card" style={{ right: 0, left: "auto", top: "calc(100% + 0.5rem)", minWidth: 280 }}><div className="api-source-hover-title">同步狀態明細</div><div className="api-source-hover-list">{syncProblems.slice(0, 6).map((source) => <div key={`${source.provider}-${source.dataset_id}`} className="api-source-hover-item"><strong>{source.provider} {source.dataset_id}｜{source.status}</strong><span>{source.title}</span><small>{source.error_message || "尚無錯誤訊息"}</small></div>)}</div></div>}</div></header><main className="app-container"><section className="map-workspace" aria-label="台灣即時觀測地圖"><div className="map-frame">{loading ? <div className="map-loading-state"><div className="map-loading-stack"><div>正在同步並載入最新觀測資料...</div></div></div> : <><div style={mapLayerStyle(activePage === "dashboard")}>{activeDataLayer === "earthquakes" ? <EarthquakeMap earthquakes={filteredEarthquakes} /> : <><MapLibreMap features={features} pm25Observations={pm25Observations} selectedCounty={selectedCounty} activeMetric={activeMetric} metricMin={metricMin} /><Legend metric={activeMetric} /></>}</div>{windyMounted && <div style={mapLayerStyle(activePage === "windy")}><WindyMapPage features={features} pm25Observations={pm25Observations} earthquakes={filteredEarthquakes} dataLayer={activeDataLayer} selectedCounty={selectedCounty} activeMetric={activeMetric} metricMin={metricMin} isActive={activePage === "windy"} /></div>}</>}</div></section><><LayerControl dataLayer={activeDataLayer} onDataLayerChange={setActiveDataLayer} activeMetric={activeMetric} onMetricChange={handleMetricChange} metricMin={metricMin} onMetricMinChange={handleMetricMinChange} earthquakeMinMagnitude={earthquakeMinMagnitude} onEarthquakeMinMagnitudeChange={setEarthquakeMinMagnitude} />{activeDataLayer === "earthquakes" ? <EarthquakeSummaryPanel earthquakes={filteredEarthquakes} minMagnitude={earthquakeMinMagnitude} /> : <CountySummaryPanel summaries={countySummaries} counties={counties} features={features} pm25Observations={pm25Observations} selectedCounty={selectedCounty} onCountySelect={setSelectedCounty} activeMetric={activeMetric} />}</></main></>;
};

export default App;
