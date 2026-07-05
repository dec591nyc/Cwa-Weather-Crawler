import React from "react";
import { metricConfigs } from "../lib/colorScale.ts";
import type { CountySummary, GeoJsonFeature, ObservationMetric, Pm25Observation } from "../types/weather.ts";

interface CountySummaryPanelProps {
  summaries: CountySummary[];
  counties: string[];
  features: GeoJsonFeature[];
  pm25Observations: Pm25Observation[];
  selectedCounty: string;
  onCountySelect: (county: string) => void;
  activeMetric: ObservationMetric;
}

function formatStatValue(value: number | null | undefined, unit: string, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(decimals)}${unit}`;
}

function getMetricStats(summary: CountySummary | undefined, metric: ObservationMetric) {
  if (!summary) return { min: null, max: null, avg: null, count: 0 };
  return (summary as any)[metric] || { min: null, max: null, avg: null, count: 0 };
}

export const CountySummaryPanel: React.FC<CountySummaryPanelProps> = ({ summaries, counties, features, pm25Observations, selectedCounty, onCountySelect, activeMetric }) => {
  const config = metricConfigs[activeMetric];
  const activeSummary = selectedCounty ? summaries.find((item) => item.county === selectedCounty) : undefined;
  const allStats = summaries.map((summary) => ({ county: summary.county, stats: getMetricStats(summary, activeMetric) })).filter((item) => item.stats.avg !== null);
  const ranked = [...allStats].sort((a, b) => (b.stats.avg || 0) - (a.stats.avg || 0)).slice(0, 8);
  const selectedStats = activeSummary ? getMetricStats(activeSummary, activeMetric) : undefined;
  const weatherStationCount = activeSummary?.weather_station_count ?? features.length;
  const airStationCount = activeSummary?.pm25_station_count ?? pm25Observations.length;

  return (
    <section className="insight-dock" aria-label="觀測資料統計">
      <div className="insight-overview" aria-live="polite">
        <div className="insight-overview-header">
          <div>
            <p className="insight-kicker">測站觀測圖層</p>
            <h2 className="insight-title">{selectedCounty || "全台"}觀測總覽</h2>
          </div>
        </div>
        <div className="summary-metrics">
          <div><span>目前指標</span><strong>{config.label}</strong><small className="summary-metric-note">{config.description}</small></div>
          <div><span>平均值</span><strong>{formatStatValue(selectedStats?.avg ?? null, config.unit, config.decimals)}</strong><small className="summary-metric-note">{selectedCounty || "各縣市平均"}</small></div>
          <div><span>測站數</span><strong>{config.source === "airQuality" ? airStationCount : weatherStationCount}</strong><small className="summary-metric-note">符合目前資料圖層</small></div>
          <div><span>縣市數</span><strong>{counties.length}</strong><small className="summary-metric-note">已彙整行政區</small></div>
        </div>
        <div className="summary-footnote">
          <span>這裡呈現目前資料圖層的統計結果</span>
          <span>切換觀測指標會同步更新縣市排行與摘要</span>
          <span>資料來源明細已集中於上方來源區塊</span>
        </div>
      </div>
      <div className="ranking-block metric-ranking-block">
        <div className="insight-block-heading"><h3>{config.label}縣市排行</h3></div>
        <ol className="ranking-list station-ranking-list">
          {ranked.map((item, index) => (
            <li key={item.county}>
              <button type="button" className={selectedCounty === item.county ? "active" : ""} onClick={() => onCountySelect(selectedCounty === item.county ? "" : item.county)}>
                <span className="ranking-station"><span className="ranking-index">{index + 1}</span><span><span className="ranking-station-name">{item.county}</span><small>樣本數 {item.stats.count}</small></span></span>
                <strong>{formatStatValue(item.stats.avg, config.unit, config.decimals)}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
