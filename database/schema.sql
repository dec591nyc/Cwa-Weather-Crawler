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

CREATE TABLE IF NOT EXISTS earthquake_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    earthquake_key TEXT NOT NULL,
    source_dataset TEXT NOT NULL,
    report_type TEXT,
    report_color TEXT,
    report_content TEXT,
    report_image_uri TEXT,
    web_uri TEXT,
    earthquake_time TEXT,
    magnitude_type TEXT,
    magnitude_value REAL,
    depth_km REAL,
    location TEXT,
    epicenter_lat REAL,
    epicenter_lon REAL,
    max_intensity TEXT,
    fetched_at TEXT NOT NULL,
    UNIQUE(source_dataset, earthquake_key)
);

CREATE TABLE IF NOT EXISTS earthquake_station_intensities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    earthquake_key TEXT NOT NULL,
    source_dataset TEXT NOT NULL,
    area_name TEXT,
    county TEXT,
    station_name TEXT,
    station_lat REAL,
    station_lon REAL,
    station_intensity TEXT,
    distance_km REAL,
    pga REAL,
    pgv REAL,
    fetched_at TEXT NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_fetch_logs_dataset_time ON fetch_logs(dataset_id, fetched_at);
CREATE INDEX IF NOT EXISTS idx_weather_obs_station_time ON weather_observations(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_weather_obs_county_time ON weather_observations(county, fetched_at);
CREATE INDEX IF NOT EXISTS idx_air_quality_station_time ON air_quality_observations(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_air_quality_county_time ON air_quality_observations(county, fetched_at);
CREATE INDEX IF NOT EXISTS idx_earthquake_events_time ON earthquake_events(earthquake_time);
CREATE INDEX IF NOT EXISTS idx_earthquake_events_source_key ON earthquake_events(source_dataset, earthquake_key);
CREATE INDEX IF NOT EXISTS idx_earthquake_station_key ON earthquake_station_intensities(source_dataset, earthquake_key);
