from __future__ import annotations

from pathlib import Path
import json
from typing import Any
from database.connection import get_connection
from config import settings


def save_raw_snapshot(dataset_id: str, raw_data: dict[str, Any], fetched_at: str) -> str:
    raw_dir = Path(settings.raw_data_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    safe_time = fetched_at.replace(":", "").replace("+", "_")
    file_path = raw_dir / f"{dataset_id}_{safe_time}.json"
    file_path.write_text(json.dumps(raw_data, ensure_ascii=False, indent=2), encoding="utf-8")
    with get_connection() as conn:
        conn.execute("INSERT INTO raw_snapshots(dataset_id, file_path, fetched_at) VALUES (?, ?, ?)", (dataset_id, str(file_path), fetched_at))
    return str(file_path)


def _insert_record(conn, table_name: str, columns: list[str], record: dict[str, Any]) -> None:
    sql = "INSERT INTO " + table_name + "(" + ", ".join(columns) + ") VALUES (" + ", ".join(["?"] * len(columns)) + ")"
    conn.execute(sql, tuple(record.get(column) for column in columns))


def save_weather_observations(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0
    weather_columns = ["station_id", "station_name", "county", "town", "lat", "lon", "altitude_m", "observed_at", "temperature", "rainfall", "rainfall_10min", "rainfall_1h", "rainfall_24h", "wind_speed", "wind_direction", "humidity", "visibility_km", "visibility_description", "uv_index", "daily_high", "daily_low", "weather", "source_dataset", "fetched_at"]
    with get_connection() as conn:
        for record in records:
            conn.execute(
                """
                INSERT INTO stations(station_id, station_name, county, town, lat, lon, altitude_m, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(station_id) DO UPDATE SET
                    station_name=excluded.station_name,
                    county=excluded.county,
                    town=excluded.town,
                    lat=excluded.lat,
                    lon=excluded.lon,
                    altitude_m=excluded.altitude_m,
                    updated_at=excluded.updated_at
                """,
                (record.get("station_id"), record.get("station_name") or record.get("station_id"), record.get("county"), record.get("town"), record.get("lat"), record.get("lon"), record.get("altitude_m"), record.get("fetched_at")),
            )
            _insert_record(conn, "weather_observations", weather_columns, record)
    return len(records)


def save_air_quality_observations(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0
    air_columns = ["station_id", "station_name", "county", "lat", "lon", "observed_at", "aqi", "status", "pollutant", "pm25", "pm25_avg", "pm10", "pm10_avg", "so2", "co", "co_8hr", "o3", "o3_8hr", "no2", "nox", "no", "source_dataset", "fetched_at"]
    with get_connection() as conn:
        for record in records:
            _insert_record(conn, "air_quality_observations", air_columns, record)
    return len(records)


def save_earthquake_observations(payload: dict[str, list[dict[str, Any]]]) -> int:
    events = payload.get("events", [])
    stations = payload.get("stations", [])
    if not events:
        return 0
    event_columns = ["earthquake_key", "source_dataset", "report_type", "report_color", "report_content", "report_image_uri", "web_uri", "earthquake_time", "magnitude_type", "magnitude_value", "depth_km", "location", "epicenter_lat", "epicenter_lon", "max_intensity", "fetched_at"]
    station_columns = ["earthquake_key", "source_dataset", "area_name", "county", "station_name", "station_lat", "station_lon", "station_intensity", "distance_km", "pga", "pgv", "fetched_at"]
    event_keys_by_dataset: dict[str, set[str]] = {}
    for event in events:
        dataset_id = event.get("source_dataset")
        event_key = event.get("earthquake_key")
        if dataset_id and event_key:
            event_keys_by_dataset.setdefault(str(dataset_id), set()).add(str(event_key))
    with get_connection() as conn:
        for dataset_id, event_keys in event_keys_by_dataset.items():
            placeholders = ", ".join(["?"] * len(event_keys))
            params = [dataset_id, *event_keys]
            conn.execute(f"DELETE FROM earthquake_station_intensities WHERE source_dataset = ? AND earthquake_key NOT IN ({placeholders})", params)
            conn.execute(f"DELETE FROM earthquake_events WHERE source_dataset = ? AND earthquake_key NOT IN ({placeholders})", params)
        for event in events:
            conn.execute(
                """
                INSERT INTO earthquake_events(earthquake_key, source_dataset, report_type, report_color, report_content, report_image_uri, web_uri, earthquake_time, magnitude_type, magnitude_value, depth_km, location, epicenter_lat, epicenter_lon, max_intensity, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_dataset, earthquake_key) DO UPDATE SET
                    report_type=excluded.report_type,
                    report_color=excluded.report_color,
                    report_content=excluded.report_content,
                    report_image_uri=excluded.report_image_uri,
                    web_uri=excluded.web_uri,
                    earthquake_time=excluded.earthquake_time,
                    magnitude_type=excluded.magnitude_type,
                    magnitude_value=excluded.magnitude_value,
                    depth_km=excluded.depth_km,
                    location=excluded.location,
                    epicenter_lat=excluded.epicenter_lat,
                    epicenter_lon=excluded.epicenter_lon,
                    max_intensity=excluded.max_intensity,
                    fetched_at=excluded.fetched_at
                """,
                tuple(event.get(column) for column in event_columns),
            )
            conn.execute("DELETE FROM earthquake_station_intensities WHERE source_dataset = ? AND earthquake_key = ?", (event.get("source_dataset"), event.get("earthquake_key")))
        for station in stations:
            _insert_record(conn, "earthquake_station_intensities", station_columns, station)
    return len(events)


def log_fetch(dataset_id: str, fetched_at: str, status: str, record_count: int, response_ms: int | None, error: str | None = None) -> None:
    with get_connection() as conn:
        conn.execute("INSERT INTO fetch_logs(dataset_id, fetched_at, status, record_count, response_ms, error_message) VALUES (?, ?, ?, ?, ?, ?)", (dataset_id, fetched_at, status, record_count, response_ms, error))
