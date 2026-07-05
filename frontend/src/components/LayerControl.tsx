import React from "react";
import { metricConfigs, metricOrder } from "../lib/colorScale.ts";
import type { ObservationMetric } from "../types/weather.ts";

interface LayerControlProps {
  activeMetric: ObservationMetric;
  onMetricChange: (metric: ObservationMetric) => void;
  metricMin: number;
  onMetricMinChange: (value: number) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  activeMetric,
  onMetricChange,
  metricMin,
  onMetricMinChange,
}) => {
  const activeConfig = metricConfigs[activeMetric];

  return (
    <section
      className="control-dock"
      aria-label="地圖控制"
      style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", justifyContent: "stretch" }}
    >
      <div className="control-group control-group-metric" style={{ maxWidth: "none" }}>
        <div className="control-label">觀測指標</div>
        <div
          className="metric-tabs"
          role="tablist"
          aria-label="觀測指標"
          style={{ flexWrap: "nowrap", overflowX: "auto", width: "100%" }}
        >
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
                style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
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
    </section>
  );
};
