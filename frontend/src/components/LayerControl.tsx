import React from "react";
import { metricConfigs, metricOrder } from "../lib/colorScale.ts";
import type { DataLayer, EarthquakeDisplayMode, ObservationMetric } from "../types/weather.ts";

interface LayerControlProps {
  dataLayer: DataLayer;
  onDataLayerChange: (layer: DataLayer) => void;
  activeMetric: ObservationMetric;
  onMetricChange: (metric: ObservationMetric) => void;
  metricMin: number;
  onMetricMinChange: (value: number) => void;
  earthquakeMinMagnitude: number;
  onEarthquakeMinMagnitudeChange: (value: number) => void;
  earthquakeDisplayMode: EarthquakeDisplayMode;
  onEarthquakeDisplayModeChange: (mode: EarthquakeDisplayMode) => void;
}

const layerOptions: Array<{ id: DataLayer; label: string; code: string; description: string }> = [
  { id: "observations", label: "氣象 / 雨量 / 空品", code: "OBS", description: "顯示測站型連續觀測指標。" },
  { id: "earthquakes", label: "地震事件", code: "EQ", description: "顯示近七天地震震央與震度測站。" },
];

const compactTabStyle: React.CSSProperties = { flex: "0 0 auto", whiteSpace: "nowrap", padding: "0.32rem 0.42rem", gap: "0.28rem" };
const compactCodeStyle: React.CSSProperties = { minWidth: 28, height: 20, fontSize: "0.62rem" };

export const LayerControl: React.FC<LayerControlProps> = ({
  dataLayer,
  onDataLayerChange,
  activeMetric,
  onMetricChange,
  metricMin,
  onMetricMinChange,
  earthquakeMinMagnitude,
  onEarthquakeMinMagnitudeChange,
  earthquakeDisplayMode,
  onEarthquakeDisplayModeChange,
}) => {
  const activeConfig = metricConfigs[activeMetric];
  return (
    <section className="control-dock" aria-label="地圖控制" style={{ gridTemplateColumns: "minmax(210px, 300px) minmax(0, 1fr) minmax(230px, 290px)", gap: "0.72rem", justifyContent: "stretch" }}>
      <div className="control-group control-group-metric" style={{ maxWidth: "none" }}>
        <div className="control-label">資料圖層</div>
        <div className="metric-tabs" role="tablist" aria-label="資料圖層" style={{ flexWrap: "nowrap", overflowX: "auto", width: "100%", gap: "0.42rem" }}>
          {layerOptions.map((layer) => (
            <button key={layer.id} type="button" className={`metric-tab ${dataLayer === layer.id ? "active" : ""}`} onClick={() => onDataLayerChange(layer.id)} role="tab" aria-selected={dataLayer === layer.id} style={compactTabStyle} title={`${layer.label}: ${layer.description}`} aria-label={`${layer.label}: ${layer.description}`}>
              <span className="metric-tab-code" style={compactCodeStyle}>{layer.code}</span>
              <span>{layer.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="control-group control-group-metric" style={{ maxWidth: "none", opacity: dataLayer === "earthquakes" ? 0.88 : 1 }}>
        <div className="control-label">觀測指標</div>
        {dataLayer === "earthquakes" ? (
          <div className="metric-tabs" aria-label="地震觀測指標" style={{ width: "100%", flexWrap: "nowrap", overflowX: "auto", gap: "0.42rem" }}>
            <button type="button" className="metric-tab active" style={compactTabStyle} title="地震事件使用規模、深度與最大震度描述，不使用氣象色階。"><span className="metric-tab-code" style={compactCodeStyle}>MAG</span><span>規模</span></button>
            <button type="button" className="metric-tab" style={compactTabStyle} title="震源深度顯示在地震 popup 與摘要卡片。"><span className="metric-tab-code" style={compactCodeStyle}>DEP</span><span>深度</span></button>
            <button type="button" className="metric-tab" style={compactTabStyle} title="最大震度與震度測站顯示在地震摘要與 popup。"><span className="metric-tab-code" style={compactCodeStyle}>INT</span><span>最大震度</span></button>
            <button type="button" className={`metric-tab ${earthquakeDisplayMode === "selected" ? "active" : ""}`} style={compactTabStyle} onClick={() => onEarthquakeDisplayModeChange("selected")} title="只顯示目前選取或最新的地震事件。"><span className="metric-tab-code" style={compactCodeStyle}>ONE</span><span>單一事件</span></button>
            <button type="button" className={`metric-tab ${earthquakeDisplayMode === "all" ? "active" : ""}`} style={compactTabStyle} onClick={() => onEarthquakeDisplayModeChange("all")} title="顯示所有符合篩選的近七天地震事件。"><span className="metric-tab-code" style={compactCodeStyle}>ALL</span><span>全部事件</span></button>
          </div>
        ) : (
          <div className="metric-tabs" role="tablist" aria-label="觀測指標" style={{ flexWrap: "nowrap", overflowX: "auto", width: "100%", gap: "0.3rem" }}>
            {metricOrder.map((metric) => {
              const config = metricConfigs[metric];
              return (
                <button key={metric} type="button" className={`metric-tab ${activeMetric === metric ? "active" : ""}`} onClick={() => onMetricChange(metric)} role="tab" aria-selected={activeMetric === metric} style={compactTabStyle} title={`${config.label}: ${config.description}`} aria-label={`${config.label}: ${config.description}`}>
                  <span className="metric-tab-code" style={compactCodeStyle}>{config.shortLabel}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="control-group control-group-slider" style={{ maxWidth: 290 }}>
        {dataLayer === "earthquakes" ? (
          <>
            <div className="slider-heading"><label className="control-label" htmlFor="earthquake-min-magnitude" title="只顯示規模大於或等於門檻的近七天地震事件。">地震規模篩選</label><span className="slider-value">{`>= M${earthquakeMinMagnitude.toFixed(1)}`}</span></div>
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
