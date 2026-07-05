PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stations (
    station_id TEXT PRIMARY KEY,
    source TEXT DEFAULT 'cwa',
    station_name TEXT NOT NULL,
    county TEXT,
    town TEXT,
    lat REAL,
    lon REAL,
    altitude_m REAL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id TEXT NOT NULL,
    station_name TEXT,
    county TEXT,
    town TEXT,
    lat REAL,
    lon REAL,
    altitude_m REAL,
    observed_at TEXT,
    temperature REAL,
    rainfall REAL,
    rainfall_10min REAL,
    rainfall_1h REAL,
    rainfall_3h REAL,
    rainfall_6h REAL,
    rainfall_12h REAL,
    rainfall_24h REAL,
    wind_speed REAL,
    wind_direction REAL,
    humidity REAL,
    visibility_km REAL,
    visibility_description TEXT,
    uv_index REAL,
    daily_high REAL,
    daily_low REAL,
    weather TEXT,
    source_dataset TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS air_quality_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id TEXT,
    station_name TEXT NOT NULL,
    county TEXT,
    lat REAL,
    lon REAL,
    observed_at TEXT,
    aqi REAL,
    status TEXT,
    pollutant TEXT,
    pm25 REAL,
    pm25_avg REAL,
    pm10 REAL,
    pm10_avg REAL,
    so2 REAL,
    co REAL,
    co_8hr REAL,
    o3 REAL,
    o3_8hr REAL,
    no2 REAL,
    nox REAL,
    no REAL,
    source_dataset TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id TEXT,
    county TEXT,
    town TEXT,
    forecast_start TEXT NOT NULL,
    forecast_end TEXT,
    weather TEXT,
    weather_code TEXT,
    min_temp REAL,
    max_temp REAL,
    temperature REAL,
    humidity REAL,
    pop REAL,
    wind_speed REAL,
    wind_direction TEXT,
    source_dataset TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

CREATE TABLE IF NOT EXISTS fetch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    status TEXT NOT NULL,
    record_count INTEGER DEFAULT 0,
    response_ms INTEGER,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS raw_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forecasts_station_id ON forecasts(station_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_time ON forecasts(forecast_start);
CREATE INDEX IF NOT EXISTS idx_forecasts_county ON forecasts(county);
CREATE INDEX IF NOT EXISTS idx_fetch_logs_dataset_time ON fetch_logs(dataset_id, fetched_at);
CREATE INDEX IF NOT EXISTS idx_weather_obs_station_time ON weather_observations(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_weather_obs_county_time ON weather_observations(county, fetched_at);
CREATE INDEX IF NOT EXISTS idx_air_quality_station_time ON air_quality_observations(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_air_quality_county_time ON air_quality_observations(county, fetched_at);
