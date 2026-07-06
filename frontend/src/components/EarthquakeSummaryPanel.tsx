import React from "react";
import type { EarthquakeEvent } from "../types/weather.ts";

interface EarthquakeSummaryPanelProps {
  earthquakes: EarthquakeEvent[];
  minMagnitude?: number;
  totalCount?: number;
  selectedEarthquakeKey?: string | null;
  onSelectEarthquake?: (earthquakeKey: string) => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value}${suffix}`;
}

export const EarthquakeSummaryPanel: React.FC<EarthquakeSummaryPanelProps> = ({ earthquakes, minMagnitude = 0, totalCount, selectedEarthquakeKey, onSelectEarthquake }) => {
  const latest = earthquakes[0];
  const deepest = [...earthquakes].sort((a, b) => (b.depth_km || 0) - (a.depth_km || 0))[0];
  const happenedCount = totalCount ?? earthquakes.length;
  return (
    <section className="insight-dock" aria-label="地震事件統計">
      <div className="insight-overview" aria-live="polite">
        <div className="insight-overview-header"><div><p className="insight-kicker">近七天地震事件</p><h2 className="insight-title">地震圖層總覽</h2></div></div>
        <div className="summary-metrics">
          <div><span>近七天事件</span><strong>{happenedCount}</strong><small className="summary-metric-note">API 回傳 count</small></div>
          <div><span>符合篩選</span><strong>{earthquakes.length}</strong><small className="summary-metric-note">規模 ≥ M{minMagnitude.toFixed(1)}</small></div>
          <div><span>最新規模</span><strong>{formatMetric(latest?.magnitude_value)}</strong><small className="summary-metric-note">{latest?.location || "尚無資料"}</small></div>
          <div><span>最大深度</span><strong>{formatMetric(deepest?.depth_km, " km")}</strong><small className="summary-metric-note">{deepest?.location || "尚無資料"}</small></div>
        </div>
        <div className="summary-footnote"><span>點擊最近事件可定位震央</span><span>單一事件模式會只顯示目前選取事件</span><span>時間範圍固定為近七天</span></div>
      </div>
      <div className="ranking-block metric-ranking-block">
        <div className="insight-block-heading"><h3>最近事件 Top 5</h3></div>
        <ol className="ranking-list station-ranking-list">
          {earthquakes.slice(0, 5).map((event, index) => (
            <li key={`${event.source_dataset}-${event.earthquake_key}`}>
              <button type="button" className={selectedEarthquakeKey === event.earthquake_key ? "active" : ""} onClick={() => onSelectEarthquake?.(event.earthquake_key)}>
                <span className="ranking-station"><span className="ranking-index">{index + 1}</span><span><span className="ranking-station-name">M {event.magnitude_value ?? "-"}｜{event.max_intensity || "震度 -"}</span><small>{event.location || event.report_content || "未標示位置"}</small></span></span>
                <strong>{formatDateTime(event.earthquake_time)}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
