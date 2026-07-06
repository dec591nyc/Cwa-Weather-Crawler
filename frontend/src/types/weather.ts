export interface ObservationProperties {
  id: number;
  station_id: string;
  station_name: string;
  county: string;
  town: string | null;
  weather: string | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: string | number | null;
  source_dataset: string;
  fetched_at: string;
  observed_at?: string | null;
  rainfall?: number | null;
  rainfall_10min?: number | null;
  rainfall_1h?: number | null;
  rainfall_24h?: number | null;
  visibility_km?: number | null;
  visibility_description?: string | null;
  uv_index?: number | null;
  daily_high?: number | null;
  daily_low?: number | null;
  altitude_m?: number | null;
}

export type ObservationMetric = "temperature" | "rainfall_10min" | "rainfall_24h" | "humidity" | "wind_speed" | "visibility_km" | "pm25" | "pm10" | "o3_8hr" | "co_8hr" | "so2" | "no2";
export type DataLayer = "observations" | "earthquakes";
export type SyncSourceState = "success" | "failed" | "unknown";
export type SyncOverallStatus = "ok" | "warning" | "error";

export interface GeoJsonFeature { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number]; }; properties: ObservationProperties; }
export interface GeoJsonCollection { type: "FeatureCollection"; features: GeoJsonFeature[]; }
export interface HealthResponse { status: string; latest_fetch: { fetched_at: string; status: string; record_count: number; } | null; }

export interface SyncSourceStatus {
  provider: string;
  dataset_id: string;
  title: string;
  category: string;
  status: SyncSourceState;
  record_count: number;
  fetched_at: string | null;
  response_ms: number | null;
  error_message: string | null;
  is_core: boolean;
}

export interface SyncStatusResponse {
  overall_status: SyncOverallStatus;
  summary: string;
  total: number;
  success_count: number;
  failed_count: number;
  unknown_count: number;
  sources: SyncSourceStatus[];
}

export interface Pm25Observation {
  id?: number;
  station_id: string | null;
  station_name: string;
  county: string | null;
  lat: number | null;
  lon: number | null;
  observed_at: string | null;
  aqi: number | null;
  status: string | null;
  pollutant: string | null;
  pm25: number | null;
  pm25_avg: number | null;
  pm10: number | null;
  pm10_avg: number | null;
  so2: number | null;
  co: number | null;
  co_8hr: number | null;
  o3: number | null;
  o3_8hr: number | null;
  no2: number | null;
  nox: number | null;
  no: number | null;
  source_dataset: string;
  fetched_at: string;
}

export interface EarthquakeStation {
  id?: number;
  earthquake_key: string;
  source_dataset: string;
  area_name: string | null;
  county: string | null;
  station_name: string | null;
  station_lat: number | null;
  station_lon: number | null;
  station_intensity: string | null;
  distance_km: number | null;
  pga: number | null;
  pgv: number | null;
  fetched_at: string;
}

export interface EarthquakeEvent {
  id?: number;
  earthquake_key: string;
  source_dataset: string;
  report_type: string | null;
  report_color: string | null;
  report_content: string | null;
  report_image_uri: string | null;
  web_uri: string | null;
  earthquake_time: string | null;
  magnitude_type: string | null;
  magnitude_value: number | null;
  depth_km: number | null;
  location: string | null;
  epicenter_lat: number | null;
  epicenter_lon: number | null;
  max_intensity: string | null;
  fetched_at: string;
  station_count?: number;
  stations?: EarthquakeStation[];
}

export interface EarthquakeResponse { count: number; days?: number; earthquakes: EarthquakeEvent[]; }
export interface NumericStats { min: number | null; max: number | null; avg: number | null; count: number; }

export interface CountySummary {
  county: string;
  weather_station_count: number;
  pm25_station_count: number;
  temperature: NumericStats;
  rainfall: NumericStats;
  rainfall_10min: NumericStats;
  rainfall_1h: NumericStats;
  rainfall_24h: NumericStats;
  humidity: NumericStats;
  wind_speed: NumericStats;
  wind_direction_avg: number | null;
  visibility_km: NumericStats;
  uv_index: NumericStats;
  pm25: NumericStats;
  pm25_avg: NumericStats;
  pm10: NumericStats;
  pm10_avg: NumericStats;
  o3_8hr: NumericStats;
  co_8hr: NumericStats;
  so2: NumericStats;
  no2: NumericStats;
}

export interface CountySummaryResponse { count: number; summaries: CountySummary[]; }

export interface ApiSource {
  provider: string;
  dataset_id: string;
  title: string;
  category: string;
  endpoint: string;
  status: string;
  map_ready: boolean;
  coordinate_quality: string;
  used_by: string[];
  metrics: string[];
  note: string;
}

export interface ApiSourcesResponse { count: number; sources: ApiSource[]; }
