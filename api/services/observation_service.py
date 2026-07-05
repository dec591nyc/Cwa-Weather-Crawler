from __future__ import annotations

import math

from database.connection import get_connection

INVALID_NUMERIC_VALUES = {-99.0, -990.0, -999.0, -9999.0}
NUMERIC_OBSERVATION_FIELDS = {
    "lat", "lon", "altitude_m", "temperature", "rainfall", "rainfall_1h", "rainfall_today",
    "wind_speed", "wind_direction", "humidity", "visibility_km", "uv_index", "daily_high", "daily_low",
    "aqi", "pm25", "pm25_avg", "pm10", "pm10_avg", "so2", "co", "co_8hr", "o3", "o3_8hr", "no2", "nox", "no",
}


def get_health_status() -> dict:
    with get_connection() as conn:
        latest = conn.execute("SELECT fetched_at, status, record_count FROM fetch_logs ORDER BY id DESC LIMIT 1").fetchone()
    return {"status": "ok", "latest_fetch": dict(latest) if latest else None}


def list_counties() -> dict:
    with get_connection() as conn:
        rows = conn.execute("SELECT DISTINCT county FROM forecasts WHERE county IS NOT NULL ORDER BY county").fetchall()
    return {"counties": [row["county"] for row in rows]}


def list_stations(county: str | None = None) -> dict:
    sql = "SELECT * FROM stations"
    params: list[str] = []
    if county:
        sql += " WHERE county = ?"
        params.append(county)
    sql += " ORDER BY county, station_name"
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"count": len(rows), "stations": [dict(row) for row in rows]}


def latest_weather_observations(county: str | None = None, limit: int = 1000) -> dict:
    rows = _latest_rows("weather_observations", county)
    return {"count": len(rows[:limit]), "observations": rows[:limit]}


def weather_stations_geojson(county: str | None = None) -> dict:
    rows = [row for row in _latest_rows("weather_observations", county) if row.get("lat") is not None and row.get("lon") is not None]
    features = []
    for row in rows:
        lon = row.pop("lon")
        lat = row.pop("lat")
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": row})
    return {"type": "FeatureCollection", "features": features}


def latest_pm25_observations(county: str | None = None, limit: int = 1000) -> dict:
    rows = _latest_rows("air_quality_observations", county)
    return {"count": len(rows[:limit]), "observations": rows[:limit]}


def county_summary() -> dict:
    weather_rows = _latest_rows("weather_observations")
    air_quality_rows = _latest_rows("air_quality_observations")
    counties_set = {row.get("county") for row in weather_rows + air_quality_rows if row.get("county")}
    summaries = []
    for county in sorted(counties_set):
        county_weather = [row for row in weather_rows if row.get("county") == county]
        county_air = [row for row in air_quality_rows if row.get("county") == county]
        summaries.append(
            {
                "county": county,
                "weather_station_count": len(county_weather),
                "pm25_station_count": len(county_air),
                "temperature": _stats([row.get("temperature") for row in county_weather]),
                "rainfall": _stats([row.get("rainfall") for row in county_weather]),
                "rainfall_1h": _stats([row.get("rainfall_1h") for row in county_weather]),
                "rainfall_today": _stats([row.get("rainfall_today") for row in county_weather]),
                "wind_speed": _stats([row.get("wind_speed") for row in county_weather]),
                "wind_direction_avg": _circular_mean_degrees([row.get("wind_direction") for row in county_weather]),
                "humidity": _stats([row.get("humidity") for row in county_weather]),
                "visibility_km": _stats([row.get("visibility_km") for row in county_weather]),
                "uv_index": _stats([row.get("uv_index") for row in county_weather]),
                "pm25": _stats([row.get("pm25") for row in county_air]),
                "pm25_avg": _stats([row.get("pm25_avg") for row in county_air]),
                "pm10": _stats([row.get("pm10") for row in county_air]),
                "pm10_avg": _stats([row.get("pm10_avg") for row in county_air]),
                "o3_8hr": _stats([row.get("o3_8hr") for row in county_air]),
                "co_8hr": _stats([row.get("co_8hr") for row in county_air]),
                "so2": _stats([row.get("so2") for row in county_air]),
                "no2": _stats([row.get("no2") for row in county_air]),
            }
        )
    return {"count": len(summaries), "summaries": summaries}


def latest_forecast(county: str | None = None, limit: int = 100) -> dict:
    sql = "SELECT * FROM forecasts WHERE fetched_at = (SELECT MAX(fetched_at) FROM forecasts)"
    params: list[object] = []
    if county:
        sql += " AND county = ?"
        params.append(county)
    sql += " ORDER BY county, forecast_start LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"count": len(rows), "forecasts": [dict(row) for row in rows]}


def forecast_history(county: str | None = None, limit: int = 500) -> dict:
    sql = "SELECT * FROM forecasts WHERE 1=1"
    params: list[object] = []
    if county:
        sql += " AND county = ?"
        params.append(county)
    sql += " ORDER BY fetched_at DESC, forecast_start ASC LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"count": len(rows), "forecasts": [dict(row) for row in rows]}


def _latest_rows(table: str, county: str | None = None) -> list[dict]:
    allowed_tables = {"weather_observations", "air_quality_observations"}
    if table not in allowed_tables:
        raise ValueError("Unsupported table: " + table)
    sql = "SELECT * FROM " + table + " WHERE fetched_at = (SELECT MAX(fetched_at) FROM " + table + ")"
    params: list[object] = []
    if county:
        sql += " AND county = ?"
        params.append(county)
    with get_connection() as conn:
        return [_sanitize_observation_row(dict(row)) for row in conn.execute(sql, params).fetchall()]


def _clean_number(value: object) -> object:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return value
    if parsed in INVALID_NUMERIC_VALUES:
        return None
    return parsed


def _sanitize_observation_row(row: dict) -> dict:
    for field in NUMERIC_OBSERVATION_FIELDS:
        if field in row:
            row[field] = _clean_number(row[field])
    return row


def _stats(values: list[float | None]) -> dict:
    valid = [value for value in values if value is not None and value not in INVALID_NUMERIC_VALUES]
    if not valid:
        return {"min": None, "max": None, "avg": None, "count": 0}
    return {"min": min(valid), "max": max(valid), "avg": sum(valid) / len(valid), "count": len(valid)}


def _circular_mean_degrees(values: list[float | None]) -> float | None:
    valid = [value for value in values if value is not None]
    if not valid:
        return None
    sin_sum = sum(math.sin(math.radians(value)) for value in valid)
    cos_sum = sum(math.cos(math.radians(value)) for value in valid)
    if sin_sum == 0 and cos_sum == 0:
        return None
    return (math.degrees(math.atan2(sin_sum, cos_sum)) + 360) % 360
