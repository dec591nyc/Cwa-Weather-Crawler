import React, { useMemo } from "react";
import {
  formatMetricValue,
  getAirQualityMetricValue,
  getWeatherMetricValue,
  metricConfigs,
} from "../lib/colorScale.ts";
import type {
  CountySummary,
  GeoJsonFeature,
  ObservationMetric,
  Pm25Observation,
} from "../types/weather.ts";

interface CountySummaryPanelProps {
  summaries: CountySummary[];
  counties: string[];
  features: GeoJsonFeature[];
  pm25Observations: Pm25Observation[];
  activeMetric: ObservationMetric;
  selectedCounty: string;
  onCountySelect: (county: string) => void;
}

interface StationMetricPoint {
  key: string;
  stationName: string;
  county: string;
  town: string;
  value: number;
  observedAt: string | null;
}

interface StationMetricStats {
  avg: number | null;
  max: StationMetricPoint | null;
  min: StationMetricPoint | null;
  count: number;
}

type RankingDirection = "highest" | "lowest";

function buildMetricPoints(
  features: GeoJsonFeature[],
  pm25Observations: Pm25Observation[],
  metric: ObservationMetric,
  selectedCounty: string
): StationMetricPoint[] {
  const config = metricConfigs[metric];
  if (config.source === "airQuality") {
    return pm25Observations
      .filter((obs) => !selectedCounty || obs.county === selectedCounty)
      .map((obs) => ({ obs, value: getAirQualityMetricValue(obs, metric) }))
      .filter((item): item is { obs: Pm25Observation; value: number } => item.value !== null)
      .map(({ obs, value }) => ({
        key: `air-${metric}-${obs.station_id || obs.station_name}`,
        stationName: obs.station_name || "-",
        county: obs.county || "",
        town: "",
        value,
        observedAt: obs.observed_at,
      }));
  }
  return features
    .filter((feature) => !selectedCounty || feature.properties.county === selectedCounty)
    .map((feature) => ({ feature, value: getWeatherMetricValue(feature.properties, metric) }))
    .filter((item): item is { feature: GeoJsonFeature; value: number } => item.value !== null)
    .map(({ feature, value }) => ({
      key: `weather-${metric}-${feature.properties.station_id}`,
      stationName: feature.properties.station_name || "-",
      county: feature.properties.county || "",
      town: feature.properties.town || "",
      value,
      observedAt: feature.properties.observed_at || feature.properties.fetched_at,
    }));
}

function summarizePoints(points: StationMetricPoint[]): StationMetricStats {
  if (!points.length) return { avg: null, max: null, min: null, count: 0 };
  const sorted = [...points].sort((a, b) => b.value - a.value);
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return { avg: total / points.length, max: sorted[0], min: sorted[sorted.length - 1], count: points.length };
}

function formatLocation(point: StationMetricPoint): string {
  return [point.county, point.town].filter(Boolean).join(" ") || "未標示縣市";
}

function getRanking(points: StationMetricPoint[], direction: RankingDirection): StationMetricPoint[] {
  return [...points].sort((a, b) => (direction === "highest" ? b.value - a.value : a.value - b.value)).slice(0, 5);
}

function RankingList({ items, metric, onCountySelect }: { items: StationMetricPoint[]; metric: ObservationMetric; onCountySelect: (county: string) => void; }) {
  return (
    <ol className="ranking-list station-ranking-list">
      {items.map((item, index) => (
        <li key={`${item.key}-${index}`}>
          <button type="button" onClick={() => onCountySelect(item.county)}>
            <span className="ranking-station">
              <span className="ranking-index">{index + 1}</span>
              <span>
                <span className="ranking-station-name">{item.stationName}</span>
                <small>{formatLocation(item)}</small>
              </span>
            </span>
            <strong>{formatMetricValue(metric, item.value)}</strong>
          </button>
        </li>
      ))}
    </ol>
  );
}

export const CountySummaryPanel: React.FC<CountySummaryPanelProps> = ({ summaries, counties, features, pm25Observations, activeMetric, selectedCounty, onCountySelect }) => {
  const metricConfig = metricConfigs[activeMetric];
  const selectedSummary = summaries.find((summary) => summary.county === selectedCounty);
  const metricPoints = useMemo(() => buildMetricPoints(features, pm25Observations, activeMetric, selectedCounty), [features, pm25Observations, activeMetric, selectedCounty]);
  const metricStats = useMemo(() => summarizePoints(metricPoints), [metricPoints]);
  const highestRanking = useMemo(() => getRanking(metricPoints, "highest"), [metricPoints]);
  const lowestRanking = useMemo(() => getRanking(metricPoints, "lowest"), [metricPoints]);
  const scopeLabel = selectedSummary ? selectedSummary.county : "全台灣";
  const stationScopeText = selectedCounty ? `${selectedCounty}測站` : "全台測站";

  return (
    <section className="insight-dock" aria-label="測站觀測統計">
      <div className="insight-overview" aria-live="polite">
        <div className="insight-overview-header">
          <div>
            <p className="insight-kicker">測站觀測圖層</p>
            <h2 className="insight-title">{scopeLabel}{metricConfig.label}統計</h2>
          </div>
          <div className="control-group control-group-wide summary-county-control">
            <label className="control-label" htmlFor="county-select">縣市</label>
            <select id="county-select" className="form-select" value={selectedCounty} onChange={(e) => onCountySelect(e.target.value)}>
              <option value="">全台灣</option>
              {counties.map((county) => <option key={county} value={county}>{county}</option>)}
            </select>
          </div>
        </div>
        <div className="summary-metrics">
          <div><span>平均</span><strong>{formatMetricValue(activeMetric, metricStats.avg)}</strong><small className="summary-metric-note">{stationScopeText}平均</small></div>
          <div><span>最高</span><strong>{formatMetricValue(activeMetric, metricStats.max?.value ?? null)}</strong><small className="summary-metric-note">{metricStats.max?.stationName ?? "無站名"}</small></div>
          <div><span>最低</span><strong>{formatMetricValue(activeMetric, metricStats.min?.value ?? null)}</strong><small className="summary-metric-note">{metricStats.min?.stationName ?? "無站名"}</small></div>
          <div><span>有效站點</span><strong>{metricStats.count}</strong><small className="summary-metric-note">目前指標有數值</small></div>
        </div>
        <div className="summary-footnote">
          <span>氣象站 {selectedSummary ? selectedSummary.weather_station_count : features.length}</span>
          <span>空品站 {selectedSummary ? selectedSummary.pm25_station_count : pm25Observations.length}</span>
          <span>依最新批次測站值計算</span>
        </div>
      </div>
      <div className="ranking-block metric-ranking-block">
        <div className="insight-block-heading"><h3>{metricConfig.label}排行榜 Top 5</h3></div>
        {metricPoints.length ? (
          <div className="ranking-columns">
            <div className="ranking-column">
              <div className="ranking-column-title"><strong>最高{metricConfig.label} Top 5</strong><span>由高到低</span></div>
              <RankingList items={highestRanking} metric={activeMetric} onCountySelect={onCountySelect} />
            </div>
            <div className="ranking-column">
              <div className="ranking-column-title"><strong>最低{metricConfig.label} Top 5</strong><span>由低到高</span></div>
              <RankingList items={lowestRanking} metric={activeMetric} onCountySelect={onCountySelect} />
            </div>
          </div>
        ) : <div className="empty-summary">目前沒有可排序的測站{metricConfig.label}資料</div>}
      </div>
    </section>
  );
};
