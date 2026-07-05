import type { ForecastProperties, ObservationMetric, Pm25Observation } from "../types/weather.ts";

export interface MetricConfig {
  id: ObservationMetric;
  label: string;
  shortLabel: string;
  unit: string;
  source: "weather" | "airQuality";
  valueKey: keyof ForecastProperties | keyof Pm25Observation;
  min: number;
  max: number;
  step: number;
  decimals: number;
  legendTitle: string;
  emptyLabel: string;
}

export interface LegendItem {
  label: string;
  color: string;
  desc: string;
  stop: number;
}

export const metricConfigs: Record<ObservationMetric, MetricConfig> = {
  temperature: {
    id: "temperature",
    label: "氣溫",
    shortLabel: "TEMP",
    unit: "°C",
    source: "weather",
    valueKey: "temperature",
    min: 0,
    max: 40,
    step: 1,
    decimals: 1,
    legendTitle: "氣溫級距",
    emptyLabel: "無氣溫",
  },
  rainfall: {
    id: "rainfall",
    label: "即時降水",
    shortLabel: "RAIN",
    unit: "mm",
    source: "weather",
    valueKey: "rainfall",
    min: 0,
    max: 80,
    step: 1,
    decimals: 1,
    legendTitle: "即時降水級距",
    emptyLabel: "無降水",
  },
  rainfall_24h: {
    id: "rainfall_24h",
    label: "24h累積雨量",
    shortLabel: "24H",
    unit: "mm",
    source: "weather",
    valueKey: "rainfall_24h",
    min: 0,
    max: 350,
    step: 5,
    decimals: 1,
    legendTitle: "24h累積雨量級距",
    emptyLabel: "無累積雨量",
  },
  humidity: {
    id: "humidity",
    label: "濕度",
    shortLabel: "RH",
    unit: "%",
    source: "weather",
    valueKey: "humidity",
    min: 0,
    max: 100,
    step: 5,
    decimals: 0,
    legendTitle: "相對濕度級距",
    emptyLabel: "無濕度",
  },
  wind_speed: {
    id: "wind_speed",
    label: "風速",
    shortLabel: "WIND",
    unit: "m/s",
    source: "weather",
    valueKey: "wind_speed",
    min: 0,
    max: 25,
    step: 1,
    decimals: 1,
    legendTitle: "風速級距",
    emptyLabel: "無風速",
  },
  visibility_km: {
    id: "visibility_km",
    label: "能見度",
    shortLabel: "VIS",
    unit: "km",
    source: "weather",
    valueKey: "visibility_km",
    min: 0,
    max: 30,
    step: 1,
    decimals: 1,
    legendTitle: "能見度級距",
    emptyLabel: "無能見度",
  },
  aqi: {
    id: "aqi",
    label: "AQI",
    shortLabel: "AQI",
    unit: "",
    source: "airQuality",
    valueKey: "aqi",
    min: 0,
    max: 300,
    step: 5,
    decimals: 0,
    legendTitle: "AQI 級距",
    emptyLabel: "無 AQI",
  },
  pm25: {
    id: "pm25",
    label: "PM2.5",
    shortLabel: "PM2.5",
    unit: "µg/m³",
    source: "airQuality",
    valueKey: "pm25",
    min: 0,
    max: 80,
    step: 1,
    decimals: 0,
    legendTitle: "PM2.5 級距",
    emptyLabel: "無 PM2.5",
  },
};

export const metricOrder: ObservationMetric[] = [
  "temperature",
  "rainfall",
  "rainfall_24h",
  "humidity",
  "wind_speed",
  "visibility_km",
  "aqi",
  "pm25",
];

const metricScales: Record<ObservationMetric, LegendItem[]> = {
  temperature: [
    { stop: Number.NEGATIVE_INFINITY, label: "< 10°C", color: "#2563eb", desc: "寒冷" },
    { stop: 10, label: "10-15°C", color: "#0284c7", desc: "偏涼" },
    { stop: 15, label: "15-20°C", color: "#16a34a", desc: "舒適" },
    { stop: 20, label: "20-25°C", color: "#ca8a04", desc: "溫和" },
    { stop: 25, label: "25-30°C", color: "#f97316", desc: "偏暖" },
    { stop: 30, label: "30-35°C", color: "#dc2626", desc: "炎熱" },
    { stop: 35, label: ">= 35°C", color: "#7f1d1d", desc: "高溫" },
  ],
  rainfall: [
    { stop: Number.NEGATIVE_INFINITY, label: "0 mm", color: "#94a3b8", desc: "無雨" },
    { stop: 1, label: "1-5 mm", color: "#38bdf8", desc: "小雨" },
    { stop: 5, label: "5-15 mm", color: "#0ea5e9", desc: "降雨" },
    { stop: 15, label: "15-30 mm", color: "#2563eb", desc: "明顯" },
    { stop: 30, label: "30-50 mm", color: "#7c3aed", desc: "大雨" },
    { stop: 50, label: ">= 50 mm", color: "#be123c", desc: "劇烈" },
  ],
  rainfall_24h: [
    { stop: Number.NEGATIVE_INFINITY, label: "0 mm", color: "#94a3b8", desc: "無雨" },
    { stop: 1, label: "1-40 mm", color: "#38bdf8", desc: "小量" },
    { stop: 40, label: "40-80 mm", color: "#0ea5e9", desc: "明顯" },
    { stop: 80, label: "80-200 mm", color: "#2563eb", desc: "大雨" },
    { stop: 200, label: "200-350 mm", color: "#7c3aed", desc: "豪雨" },
    { stop: 350, label: ">= 350 mm", color: "#be123c", desc: "劇烈" },
  ],
  humidity: [
    { stop: Number.NEGATIVE_INFINITY, label: "< 50%", color: "#f59e0b", desc: "乾燥" },
    { stop: 50, label: "50-65%", color: "#84cc16", desc: "舒適" },
    { stop: 65, label: "65-80%", color: "#14b8a6", desc: "濕潤" },
    { stop: 80, label: "80-90%", color: "#0ea5e9", desc: "偏濕" },
    { stop: 90, label: ">= 90%", color: "#1d4ed8", desc: "潮濕" },
  ],
  wind_speed: [
    { stop: Number.NEGATIVE_INFINITY, label: "< 2 m/s", color: "#94a3b8", desc: "微風" },
    { stop: 2, label: "2-5 m/s", color: "#22c55e", desc: "和風" },
    { stop: 5, label: "5-10 m/s", color: "#facc15", desc: "明顯" },
    { stop: 10, label: "10-17 m/s", color: "#f97316", desc: "強風" },
    { stop: 17, label: ">= 17 m/s", color: "#dc2626", desc: "劇烈" },
  ],
  visibility_km: [
    { stop: Number.NEGATIVE_INFINITY, label: "< 1 km", color: "#7f1d1d", desc: "極差" },
    { stop: 1, label: "1-3 km", color: "#dc2626", desc: "不佳" },
    { stop: 3, label: "3-6 km", color: "#f97316", desc: "偏低" },
    { stop: 6, label: "6-10 km", color: "#ca8a04", desc: "普通" },
    { stop: 10, label: ">= 10 km", color: "#16a34a", desc: "良好" },
  ],
  aqi: [
    { stop: Number.NEGATIVE_INFINITY, label: "0-50", color: "#16a34a", desc: "良好" },
    { stop: 51, label: "51-100", color: "#ca8a04", desc: "普通" },
    { stop: 101, label: "101-150", color: "#f97316", desc: "敏感族群" },
    { stop: 151, label: "151-200", color: "#dc2626", desc: "不健康" },
    { stop: 201, label: "201-300", color: "#7c3aed", desc: "非常不健康" },
    { stop: 301, label: "> 300", color: "#7f1d1d", desc: "危害" },
  ],
  pm25: [
    { stop: Number.NEGATIVE_INFINITY, label: "0-15", color: "#16a34a", desc: "良好" },
    { stop: 15, label: "15-25", color: "#ca8a04", desc: "普通" },
    { stop: 25, label: "25-35", color: "#f97316", desc: "偏高" },
    { stop: 35, label: "35-54", color: "#dc2626", desc: "不良" },
    { stop: 54, label: ">= 54", color: "#7f1d1d", desc: "嚴重" },
  ],
};

export function getMetricLegendItems(metric: ObservationMetric): LegendItem[] {
  return metricScales[metric];
}

export function getMetricColor(metric: ObservationMetric, value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#64748b";
  const scale = metricScales[metric];
  let color = scale[0].color;
  for (const item of scale) {
    if (value >= item.stop) color = item.color;
  }
  return color;
}

export function getMapLibreColorExpression(metric: ObservationMetric): unknown[] {
  const scale = metricScales[metric];
  const expression: unknown[] = ["step", ["to-number", ["get", "value"]], scale[0].color];
  for (const item of scale.slice(1)) {
    expression.push(item.stop, item.color);
  }
  return ["case", ["==", ["get", "value"], null], "#64748b", expression];
}

export function formatMetricValue(metric: ObservationMetric, value: number | null): string {
  const config = metricConfigs[metric];
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(config.decimals)}${config.unit}`;
}

export function getWeatherMetricValue(
  props: ForecastProperties,
  metric: ObservationMetric
): number | null {
  const config = metricConfigs[metric];
  if (config.source !== "weather") return null;
  const rawValue = props[config.valueKey as keyof ForecastProperties];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;
}

export function getAirQualityMetricValue(obs: Pm25Observation, metric: ObservationMetric): number | null {
  const config = metricConfigs[metric];
  if (config.source !== "airQuality") return null;
  const rawValue = obs[config.valueKey as keyof Pm25Observation];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;
}

export function getPm25MetricValue(obs: Pm25Observation): number | null {
  return getAirQualityMetricValue(obs, "pm25");
}
