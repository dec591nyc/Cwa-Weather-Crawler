export interface ForecastProperties {
  id: number;
  station_id: string;
  station_name: string;
  county: string;
  town: string | null;
  forecast_start: string;
  forecast_end: string;
  weather: string | null;
  weather_code: string | null;
  min_temp: number | null;
  max_temp: number | null;
  temperature: number | null;
  humidity: number | null;
  pop: number | null;
  wind_speed: number | null;
  wind_direction: string | null;
  source_dataset: string;
  fetched_at: string;
  observed_at?: string | null;
  rainfall?: number | null;
  uv_index?: number | null;
  daily_high?: number | null;
  daily_low?: number | null;
  altitude_m?: number | null;
}

export type ObservationMetric =
  | "temperature"
  | "rainfall"
  | "humidity"
  | "wind_speed"
  | "pm25";

export interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: ForecastProperties;
}

export interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface HealthResponse {
  status: string;
  latest_fetch: {
    fetched_at: string;
    status: string;
    record_count: number;
  } | null;
}

export interface Pm25Observation {
  id?: number;
  station_id: string | null;
  station_name: string;
  county: string | null;
  lat: number | null;
  lon: number | null;
  observed_at: string | null;
  pm25: number | null;
  pm25_avg: number | null;
  source_dataset: string;
  fetched_at: string;
}

export interface NumericStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

export interface CountySummary {
  county: string;
  weather_station_count: number;
  pm25_station_count: number;
  temperature: NumericStats;
  rainfall: NumericStats;
  humidity: NumericStats;
  wind_speed: NumericStats;
  wind_direction_avg: number | null;
  uv_index: NumericStats;
  pm25: NumericStats;
  pm25_avg: NumericStats;
}

export interface CountySummaryResponse {
  count: number;
  summaries: CountySummary[];
}
