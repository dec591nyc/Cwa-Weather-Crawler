import React from "react";
import { getMetricLegendItems, metricConfigs } from "../lib/colorScale.ts";
import type { ObservationMetric } from "../types/weather.ts";

interface LegendProps {
  metric: ObservationMetric;
}

export const Legend: React.FC<LegendProps> = ({ metric }) => {
  const config = metricConfigs[metric];
  const legendItems = getMetricLegendItems(metric);

  return (
    <div className="legend-card" aria-label={`${config.label}圖例`}>
      <div className="legend-title">{config.legendTitle}</div>
      {legendItems.map((item) => (
        <div className="legend-row" key={`${metric}-${item.label}`}>
          <div
            className="legend-color-box"
            style={{ backgroundColor: item.color }}
          />
          <span className="legend-label">{item.label}</span>
          <span className="legend-desc">{item.desc}</span>
        </div>
      ))}
      <div className="legend-null-row">
        <div className="legend-color-box" style={{ backgroundColor: "#64748b" }} />
        <span className="legend-label">-</span>
        <span className="legend-desc">{config.emptyLabel}</span>
      </div>
    </div>
  );
};
