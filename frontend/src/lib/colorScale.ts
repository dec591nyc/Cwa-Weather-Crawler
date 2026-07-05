import type { ObservationMetric, ObservationProperties, Pm25Observation } from "../types/weather.ts";

export interface MetricConfig {
  id: ObservationMetric;
  label: string;
  shortLabel: string;
  unit: string;
  source: "weather" | "airQuality";
  valueKey: keyof ObservationProperties | keyof Pm25Observation;
  min: number;
  max: number;
  step: number;
  decimals: number;
  legendTitle: string;
  emptyLabel: string;
  description: string;
}

export interface LegendItem { label: string; color: string; desc: string; stop: number; }

export const metricConfigs: Record<ObservationMetric, MetricConfig> = {
  temperature: { id: "temperature", label: "氣溫", shortLabel: "TEMP", unit: "°C", source: "weather", valueKey: "temperature", min: 0, max: 40, step: 1, decimals: 1, legendTitle: "氣溫級距", emptyLabel: "無氣溫", description: "測站即時氣溫。" },
  rainfall_10min: { id: "rainfall_10min", label: "近10分降雨", shortLabel: "10M RAIN", unit: "mm", source: "weather", valueKey: "rainfall_10min", min: 0, max: 50, step: 0.5, decimals: 1, legendTitle: "近10分降雨級距", emptyLabel: "無近10分降雨", description: "最近 10 分鐘內的降雨量，用於觀察即時強降雨。" },
  rainfall_24h: { id: "rainfall_24h", label: "近24時降雨", shortLabel: "24H RAIN", unit: "mm", source: "weather", valueKey: "rainfall_24h", min: 0, max: 350, step: 5, decimals: 1, legendTitle: "近24時降雨級距", emptyLabel: "無近24時降雨", description: "最近 24 小時累積降雨量。若 API 未提供資料，前端不會補成 0。" },
  humidity: { id: "humidity", label: "濕度", shortLabel: "RH", unit: "%", source: "weather", valueKey: "humidity", min: 0, max: 100, step: 5, decimals: 0, legendTitle: "相對濕度級距", emptyLabel: "無濕度", description: "相對濕度，數值越高代表空氣越潮濕。" },
  wind_speed: { id: "wind_speed", label: "風速", shortLabel: "WIND", unit: "m/s", source: "weather", valueKey: "wind_speed", min: 0, max: 25, step: 1, decimals: 1, legendTitle: "風速級距", emptyLabel: "無風速", description: "測站風速，適合觀察強風與陣風風險。" },
  visibility_km: { id: "visibility_km", label: "能見度", shortLabel: "VIS", unit: "km", source: "weather", valueKey: "visibility_km", min: 0, max: 30, step: 1, decimals: 1, legendTitle: "能見度級距", emptyLabel: "無能見度", description: "水平能見距離，數值越低代表霧、雨、霾或空污可能影響視線。" },
  pm25: { id: "pm25", label: "PM2.5", shortLabel: "PM2.5", unit: "µg/m³", source: "airQuality", valueKey: "pm25", min: 0, max: 80, step: 1, decimals: 0, legendTitle: "PM2.5 級距", emptyLabel: "無 PM2.5", description: "細懸浮微粒，粒徑小於 2.5 微米，容易深入肺部，是高污染時最重要的民生指標之一。" },
  pm10: { id: "pm10", label: "PM10", shortLabel: "PM10", unit: "µg/m³", source: "airQuality", valueKey: "pm10", min: 0, max: 300, step: 5, decimals: 0, legendTitle: "PM10 級距", emptyLabel: "無 PM10", description: "懸浮微粒，常與揚塵、道路塵土、營建與境外污染有關。" },
  o3_8hr: { id: "o3_8hr", label: "O3 8hr", shortLabel: "O3", unit: "ppb", source: "airQuality", valueKey: "o3_8hr", min: 0, max: 200, step: 5, decimals: 0, legendTitle: "臭氧 8 小時級距", emptyLabel: "無 O3", description: "臭氧 8 小時移動平均，常見於日照強、光化學反應旺盛時升高。" },
  co_8hr: { id: "co_8hr", label: "CO 8hr", shortLabel: "CO", unit: "ppm", source: "airQuality", valueKey: "co_8hr", min: 0, max: 20, step: 0.5, decimals: 1, legendTitle: "一氧化碳 8 小時級距", emptyLabel: "無 CO", description: "一氧化碳 8 小時移動平均，多與燃燒不完全及交通排放有關。" },
  so2: { id: "so2", label: "SO2", shortLabel: "SO2", unit: "ppb", source: "airQuality", valueKey: "so2", min: 0, max: 300, step: 5, decimals: 0, legendTitle: "二氧化硫級距", emptyLabel: "無 SO2", description: "二氧化硫，通常與含硫燃料燃燒、工業排放或火山活動有關。" },
  no2: { id: "no2", label: "NO2", shortLabel: "NO2", unit: "ppb", source: "airQuality", valueKey: "no2", min: 0, max: 400, step: 5, decimals: 0, legendTitle: "二氧化氮級距", emptyLabel: "無 NO2", description: "二氧化氮，常與車輛、燃燒與工業排放有關，也是臭氧形成的重要前驅物之一。" },
};

export const metricOrder: ObservationMetric[] = ["temperature", "rainfall_10min", "rainfall_24h", "humidity", "wind_speed", "visibility_km", "pm25", "pm10", "o3_8hr", "co_8hr", "so2", "no2"];

const metricScales: Record<ObservationMetric, LegendItem[]> = {
  temperature: [{ stop: Number.NEGATIVE_INFINITY, label: "< 10°C", color: "#2563eb", desc: "寒冷" }, { stop: 10, label: "10-15°C", color: "#0284c7", desc: "偏涼" }, { stop: 15, label: "15-20°C", color: "#16a34a", desc: "舒適" }, { stop: 20, label: "20-25°C", color: "#ca8a04", desc: "溫和" }, { stop: 25, label: "25-30°C", color: "#f97316", desc: "偏暖" }, { stop: 30, label: "30-35°C", color: "#dc2626", desc: "炎熱" }, { stop: 35, label: ">= 35°C", color: "#7f1d1d", desc: "高溫" }],
  rainfall_10min: [{ stop: Number.NEGATIVE_INFINITY, label: "0 mm", color: "#94a3b8", desc: "無雨" }, { stop: 0.5, label: "0.5-2 mm", color: "#38bdf8", desc: "小雨" }, { stop: 2, label: "2-5 mm", color: "#0ea5e9", desc: "明顯" }, { stop: 5, label: "5-10 mm", color: "#2563eb", desc: "偏強" }, { stop: 10, label: "10-20 mm", color: "#7c3aed", desc: "強降雨" }, { stop: 20, label: ">= 20 mm", color: "#be123c", desc: "劇烈" }],
  rainfall_24h: [{ stop: Number.NEGATIVE_INFINITY, label: "0 mm", color: "#94a3b8", desc: "無雨" }, { stop: 1, label: "1-40 mm", color: "#38bdf8", desc: "小量" }, { stop: 40, label: "40-80 mm", color: "#0ea5e9", desc: "明顯" }, { stop: 80, label: "80-200 mm", color: "#2563eb", desc: "大雨" }, { stop: 200, label: "200-350 mm", color: "#7c3aed", desc: "豪雨" }, { stop: 350, label: ">= 350 mm", color: "#be123c", desc: "劇烈" }],
  humidity: [{ stop: Number.NEGATIVE_INFINITY, label: "< 50%", color: "#f59e0b", desc: "乾燥" }, { stop: 50, label: "50-65%", color: "#84cc16", desc: "舒適" }, { stop: 65, label: "65-80%", color: "#14b8a6", desc: "濕潤" }, { stop: 80, label: "80-90%", color: "#0ea5e9", desc: "偏濕" }, { stop: 90, label: ">= 90%", color: "#1d4ed8", desc: "潮濕" }],
  wind_speed: [{ stop: Number.NEGATIVE_INFINITY, label: "< 2 m/s", color: "#94a3b8", desc: "微風" }, { stop: 2, label: "2-5 m/s", color: "#22c55e", desc: "和風" }, { stop: 5, label: "5-10 m/s", color: "#facc15", desc: "明顯" }, { stop: 10, label: "10-17 m/s", color: "#f97316", desc: "強風" }, { stop: 17, label: ">= 17 m/s", color: "#dc2626", desc: "劇烈" }],
  visibility_km: [{ stop: Number.NEGATIVE_INFINITY, label: "< 1 km", color: "#7f1d1d", desc: "極差" }, { stop: 1, label: "1-3 km", color: "#dc2626", desc: "不佳" }, { stop: 3, label: "3-6 km", color: "#f97316", desc: "偏低" }, { stop: 6, label: "6-10 km", color: "#ca8a04", desc: "普通" }, { stop: 10, label: ">= 10 km", color: "#16a34a", desc: "良好" }],
  pm25: [{ stop: Number.NEGATIVE_INFINITY, label: "0-15", color: "#16a34a", desc: "良好" }, { stop: 15.5, label: "15.5-35.4", color: "#ca8a04", desc: "普通" }, { stop: 35.5, label: "35.5-54.4", color: "#f97316", desc: "偏高" }, { stop: 54.5, label: ">= 54.5", color: "#dc2626", desc: "不良" }],
  pm10: [{ stop: Number.NEGATIVE_INFINITY, label: "0-50", color: "#16a34a", desc: "良好" }, { stop: 51, label: "51-100", color: "#ca8a04", desc: "普通" }, { stop: 101, label: "101-254", color: "#f97316", desc: "偏高" }, { stop: 255, label: ">= 255", color: "#dc2626", desc: "不良" }],
  o3_8hr: [{ stop: Number.NEGATIVE_INFINITY, label: "0-54", color: "#16a34a", desc: "良好" }, { stop: 55, label: "55-70", color: "#ca8a04", desc: "普通" }, { stop: 71, label: "71-85", color: "#f97316", desc: "偏高" }, { stop: 86, label: ">= 86", color: "#dc2626", desc: "不良" }],
  co_8hr: [{ stop: Number.NEGATIVE_INFINITY, label: "0-4.4", color: "#16a34a", desc: "良好" }, { stop: 4.5, label: "4.5-9.4", color: "#ca8a04", desc: "普通" }, { stop: 9.5, label: "9.5-12.4", color: "#f97316", desc: "偏高" }, { stop: 12.5, label: ">= 12.5", color: "#dc2626", desc: "不良" }],
  so2: [{ stop: Number.NEGATIVE_INFINITY, label: "0-20", color: "#16a34a", desc: "良好" }, { stop: 21, label: "21-75", color: "#ca8a04", desc: "普通" }, { stop: 76, label: "76-185", color: "#f97316", desc: "偏高" }, { stop: 186, label: ">= 186", color: "#dc2626", desc: "不良" }],
  no2: [{ stop: Number.NEGATIVE_INFINITY, label: "0-30", color: "#16a34a", desc: "良好" }, { stop: 31, label: "31-100", color: "#ca8a04", desc: "普通" }, { stop: 101, label: "101-360", color: "#f97316", desc: "偏高" }, { stop: 361, label: ">= 361", color: "#dc2626", desc: "不良" }],
};

export function getMetricLegendItems(metric: ObservationMetric): LegendItem[] { return metricScales[metric]; }

export function getMetricColor(metric: ObservationMetric, value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#64748b";
  const scale = metricScales[metric];
  let color = scale[0].color;
  for (const item of scale) if (value >= item.stop) color = item.color;
  return color;
}

export function getMapLibreColorExpression(metric: ObservationMetric): unknown[] {
  const scale = metricScales[metric];
  const expression: unknown[] = ["step", ["to-number", ["get", "value"]], scale[0].color];
  for (const item of scale.slice(1)) expression.push(item.stop, item.color);
  return ["case", ["==", ["get", "value"], null], "#64748b", expression];
}

export function formatMetricValue(metric: ObservationMetric, value: number | null): string {
  const config = metricConfigs[metric];
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(config.decimals)}${config.unit}`;
}

export function getWeatherMetricValue(props: ObservationProperties, metric: ObservationMetric): number | null {
  const config = metricConfigs[metric];
  if (config.source !== "weather") return null;
  const rawValue = props[config.valueKey as keyof ObservationProperties];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;
}

export function getAirQualityMetricValue(obs: Pm25Observation, metric: ObservationMetric): number | null {
  const config = metricConfigs[metric];
  if (config.source !== "airQuality") return null;
  const rawValue = obs[config.valueKey as keyof Pm25Observation];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;
}

export function getPm25MetricValue(obs: Pm25Observation): number | null { return getAirQualityMetricValue(obs, "pm25"); }
