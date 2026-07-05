import React from "react";
import { metricConfigs, metricOrder } from "../lib/colorScale.ts";
import type { DataLayer, ObservationMetric } from "../types/weather.ts";

interface LayerControlProps {
  dataLayer: DataLayer;
  onDataLayerChange: (layer: DataLayer) => void;
  activeMetric: ObservationMetric;
  onMetricChange: (metric: ObservationMetric) => void;
  metricMin: number;
  onMetricMinChange: (value: number) => void;
}

const layerOptions: Array<{ id: DataLayer; label: string; code: string; description: string }> = [
  { id: "observations", label: "氣象 / 雨量 / 空品", code: "OBS", description: "顯示測站型連續觀測指標。" },
  { id: "earthquakes", label: "地震事件", code: "EQ", description: "顯示地震震央與最新事件的震度測站。" },
];

export const LayerControl: React.FC<LayerControlProps> = ({ dataLayer, onDataLayerChange, activeMetric, onMetricChange, metricMin, onMetricMinChange }) => {
  const activeConfig = metricConfigs[activeMetric];
  return (
    <section className="control-dock" aria-label="地圖控制" style={{ gridTemplateColumns: "minmax(240px, 360px) minmax(0, 1fr) minmax(280px, 360px)", justifyContent: "stretch" }}>
      <div className="control-group control-group-metric" style={{ maxWidth: "none" }}>
        <div className="control-label">資料圖層</div>
        <div className="metric-tabs" role="tablist" aria-label="資料圖層" style={{ flexWrap: "nowrap", overflowX: "auto", width: "100%" }}>
          {layerOptions.map((layer) => (
            <button key={layer.id} type="button" className={`metric-tab ${dataLayer === layer.id ? "active" : ""}`} onClick={() => onDataLayerChange(layer.id)} role="tab" aria-selected={dataLayer === layer.id} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} title={`${layer.label}: ${layer.description}`} aria-label={`${layer.label}: ${layer.description}`}>
              <span className="metric-tab-code">{layer.code}</span>
              <span>{layer.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="control-group control-group-metric" style={{ maxWidth: "none", opacity: dataLayer === "earthquakes" ? 0.62 : 1 }}>
        <div className="control-label">觀測指標</div>
        {dataLayer === "earthquakes" ? (
          <div className="metric-tabs" aria-label="地震圖層說明" style={{ width: "100%" }}>
            <button type="button" className="metric-tab active" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>
              <span className="metric-tab-code">EQ</span>
              <span>震央 / 規模 / 震度測站</span>
            </button>
          </div>
        ) : (
          <div className="metric-tabs" role="tablist" aria-label="觀測指標" style={{ flexWrap: "nowrap", overflowX: "auto", width: "100%" }}>
            {metricOrder.map((metric) => {
              const config = metricConfigs[metric];
              return (
                <button key={metric} type="button" className={`metric-tab ${activeMetric === metric ? "active" : ""}`} onClick={() => onMetricChange(metric)} role="tab" aria-selected={activeMetric === metric} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} title={`${config.label}: ${config.description}`} aria-label={`${config.label}: ${config.description}`}>
                  <span className="metric-tab-code">{config.shortLabel}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="control-group control-group-slider">
        {dataLayer === "earthquakes" ? (
          <div className="slider-heading"><span className="control-label">地震圖層</span><span className="slider-value">顯示最近事件</span></div>
        ) : (
          <>
            <div className="slider-heading"><label className="control-label" htmlFor="metric-min" title={activeConfig.description}>{activeConfig.label}篩選</label><span className="slider-value">{`>= ${metricMin}${activeConfig.unit}`}</span></div>
            <input id="metric-min" type="range" min={activeConfig.min} max={activeConfig.max} step={activeConfig.step} value={metricMin} onChange={(e) => onMetricMinChange(Number(e.target.value))} className="range-slider" />
          </>
        )}
      </div>
    </section>
  );
};
