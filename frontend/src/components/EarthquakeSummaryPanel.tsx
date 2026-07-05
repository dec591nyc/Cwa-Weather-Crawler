import React from "react";
import type { EarthquakeEvent } from "../types/weather.ts";

interface EarthquakeSummaryPanelProps { earthquakes: EarthquakeEvent[]; }

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const EarthquakeSummaryPanel: React.FC<EarthquakeSummaryPanelProps> = ({ earthquakes }) => {
  const latest = earthquakes[0];
  const strongest = [...earthquakes].sort((a, b) => (b.magnitude_value || 0) - (a.magnitude_value || 0))[0];
  return (
    <section className="insight-dock" aria-label="地震觀測統計">
      <div className="insight-overview" aria-live="polite">
        <div className="insight-overview-header">
          <div>
            <p className="insight-kicker">中央氣象署地震資料</p>
            <h2 className="insight-title">最近地震與震度測站</h2>
          </div>
        </div>
        <div className="summary-metrics">
          <div><span>最新規模</span><strong>{latest?.magnitude_value ?? "-"}</strong><small className="summary-metric-note">{latest?.location || "尚無資料"}</small></div>
          <div><span>最新時間</span><strong>{formatDateTime(latest?.earthquake_time || null)}</strong><small className="summary-metric-note">震央時間</small></div>
          <div><span>最大規模</span><strong>{strongest?.magnitude_value ?? "-"}</strong><small className="summary-metric-note">{strongest?.location || "尚無資料"}</small></div>
          <div><span>震度測站</span><strong>{latest?.station_count ?? 0}</strong><small className="summary-metric-note">最新事件測站數</small></div>
        </div>
        <div className="summary-footnote"><span>震央點依規模大小顯示</span><span>震度測站顯示最新一筆地震</span><span>E-A0015-001 / E-A0016-001</span></div>
      </div>
    </section>
  );
};
