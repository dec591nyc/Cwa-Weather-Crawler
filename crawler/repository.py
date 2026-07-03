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
        conn.execute(
            "INSERT INTO raw_snapshots(dataset_id, file_path, fetched_at) VALUES (?, ?, ?)",
            (dataset_id, str(file_path), fetched_at),
        )
    return str(file_path)


def save_forecasts(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0

    with get_connection() as conn:
        for record in records:
            if record.get("station_id"):
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
                    (
                        record.get("station_id"),
                        record.get("station_name") or record.get("station_id"),
                        record.get("county"),
                        record.get("town"),
                        record.get("lat"),
                        record.get("lon"),
                        record.get("altitude_m"),
                        record.get("fetched_at"),
                    ),
                )

            conn.execute(
                """
                INSERT INTO forecasts(
                    station_id, county, town, forecast_start, forecast_end, weather, weather_code,
                    min_temp, max_temp, temperature, humidity, pop, wind_speed, wind_direction,
                    source_dataset, fetched_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.get("station_id"),
                    record.get("county"),
                    record.get("town"),
                    record.get("forecast_start"),
                    record.get("forecast_end"),
                    record.get("weather"),
                    record.get("weather_code"),
                    record.get("min_temp"),
                    record.get("max_temp"),
                    record.get("temperature"),
                    record.get("humidity"),
                    record.get("pop"),
                    record.get("wind_speed"),
                    record.get("wind_direction"),
                    record.get("source_dataset"),
                    record.get("fetched_at"),
                ),
            )
    return len(records)


def save_weather_observations(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0

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
                (
                    record.get("station_id"),
                    record.get("station_name") or record.get("station_id"),
                    record.get("county"),
                    record.get("town"),
                    record.get("lat"),
                    record.get("lon"),
                    record.get("altitude_m"),
                    record.get("fetched_at"),
                ),
            )
            conn.execute(
                """
                INSERT INTO weather_observations(
                    station_id, station_name, county, town, lat, lon, altitude_m, observed_at,
                    temperature, rainfall, wind_speed, wind_direction, humidity, uv_index,
                    daily_high, daily_low, weather, source_dataset, fetched_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.get("station_id"),
                    record.get("station_name"),
                    record.get("county"),
                    record.get("town"),
                    record.get("lat"),
                    record.get("lon"),
                    record.get("altitude_m"),
                    record.get("observed_at"),
                    record.get("temperature"),
                    record.get("rainfall"),
                    record.get("wind_speed"),
                    record.get("wind_direction"),
                    record.get("humidity"),
                    record.get("uv_index"),
                    record.get("daily_high"),
                    record.get("daily_low"),
                    record.get("weather"),
                    record.get("source_dataset"),
                    record.get("fetched_at"),
                ),
            )
    return len(records)


def save_air_quality_observations(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0

    with get_connection() as conn:
        for record in records:
            conn.execute(
                """
                INSERT INTO air_quality_observations(
                    station_id, station_name, county, lat, lon, observed_at,
                    pm25, pm25_avg, source_dataset, fetched_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.get("station_id"),
                    record.get("station_name"),
                    record.get("county"),
                    record.get("lat"),
                    record.get("lon"),
                    record.get("observed_at"),
                    record.get("pm25"),
                    record.get("pm25_avg"),
                    record.get("source_dataset"),
                    record.get("fetched_at"),
                ),
            )
    return len(records)


def log_fetch(dataset_id: str, fetched_at: str, status: str, record_count: int, response_ms: int | None, error: str | None = None) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO fetch_logs(dataset_id, fetched_at, status, record_count, response_ms, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (dataset_id, fetched_at, status, record_count, response_ms, error),
        )
