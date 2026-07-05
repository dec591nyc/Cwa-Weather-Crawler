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
  earthquakeMinMagnitude: number;
  onEarthquakeMinMagnitudeChange: (value: number) => void;
}

const layerOptions: Array<{ id: DataLayer; label: string; code: string; description: string }> = [
  { id: "observations", label: "氣象 / 雨量 / 空品", code: "OBS", description: "顯示測站型連續觀測指標。" },
  { id: "earthquakes", label: "地震事件", code: "EQ", description: "顯示近七天地震震央與震度測站。" },
];

export const LayerControl: React.FC<LayerControlProps> = ({
  dataLayer,
  onDataLayerChange,
  activeMetric,
  onMetricChange,
  metricMin,
  onMetricMinChange,
  earthquakeMinMagnitude,
  onEarthquakeMinMagnitudeChange,
}) => {
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
      <div className="control-group control-group-metric" style={{ maxWidth: "none", opacity: dataLayer === "earthquakes" ? 0.88 : 1 }}>
        <div className="control-label">觀測指標</div>
        {dataLayer === "earthquakes" ? (
          <div className="metric-tabs" aria-label="地震觀測指標" style={{ width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
            <button type="button" className="metric-tab active" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} title="地震事件使用規模、深度與最大震度描述，不使用氣象色階。">
              <span className="metric-tab-code">MAG</span>
              <span>規模</span>
            </button>
            <button type="button" className="metric-tab" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} title="震源深度顯示在地震 popup 與摘要卡片。">
              <span className="metric-tab-code">DEP</span>
              <span>深度</span>
            </button>
            <button type="button" className="metric-tab" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} title="最大震度與震度測站顯示在地震摘要與 popup。">
              <span className="metric-tab-code">INT</span>
              <span>最大震度</span>
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
          <>
            <div className="slider-heading">
              <label className="control-label" htmlFor="earthquake-min-magnitude" title="只顯示規模大於或等於門檻的近七天地震事件。">地震規模篩選</label>
              <span className="slider-value">{`>= M${earthquakeMinMagnitude.toFixed(1)}`}</span>
            </div>
            <input id="earthquake-min-magnitude" type="range" min={0} max={7} step={0.1} value={earthquakeMinMagnitude} onChange={(e) => onEarthquakeMinMagnitudeChange(Number(e.target.value))} className="range-slider" />
          </>
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
