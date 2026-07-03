import React from "react";
import { metricConfigs, metricOrder } from "../lib/colorScale.ts";
import type { ObservationMetric } from "../types/weather.ts";

interface LayerControlProps {
  counties: string[];
  selectedCounty: string;
  onCountyChange: (county: string) => void;

  activeMetric: ObservationMetric;
  onMetricChange: (metric: ObservationMetric) => void;
  metricMin: number;
  onMetricMinChange: (value: number) => void;

  weatherCount: number | null;
  pm25Count: number | null;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  counties,
  selectedCounty,
  onCountyChange,
  activeMetric,
  onMetricChange,
  metricMin,
  onMetricMinChange,
  weatherCount,
  pm25Count,
}) => {
  const activeConfig = metricConfigs[activeMetric];

  return (
    <section className="control-dock" aria-label="地圖控制">
      <div className="control-group control-group-wide">
        <label className="control-label" htmlFor="county-select">縣市</label>
        <select
          id="county-select"
          className="form-select"
          value={selectedCounty}
          onChange={(e) => onCountyChange(e.target.value)}
        >
          <option value="">全台灣</option>
          {counties.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group control-group-metric">
        <div className="control-label">觀測指標</div>
        <div className="metric-tabs" role="tablist" aria-label="觀測指標">
          {metricOrder.map((metric) => {
            const config = metricConfigs[metric];
            return (
              <button
                key={metric}
                type="button"
                className={`metric-tab ${activeMetric === metric ? "active" : ""}`}
                onClick={() => onMetricChange(metric)}
                role="tab"
                aria-selected={activeMetric === metric}
              >
                <span className="metric-tab-code">{config.shortLabel}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="control-group control-group-slider">
        <div className="slider-heading">
          <label className="control-label" htmlFor="metric-min">
            {activeConfig.label}篩選
          </label>
          <span className="slider-value">
            {`>= ${metricMin}${activeConfig.unit}`}
          </span>
        </div>
        <input
          id="metric-min"
          type="range"
          min={activeConfig.min}
          max={activeConfig.max}
          step={activeConfig.step}
          value={metricMin}
          onChange={(e) => onMetricMinChange(Number(e.target.value))}
          className="range-slider"
        />
      </div>

      <div className="control-group control-group-status">
        <div className="control-label">資料筆數</div>
        <div className="data-status">
          <span>天氣 {weatherCount ?? "-"}</span>
          <span>PM2.5 {pm25Count ?? "-"}</span>
        </div>
      </div>
    </section>
  );
};
