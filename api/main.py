from __future__ import annotations

import math

from fastapi import FastAPI, Query
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database.connection import get_connection

app = FastAPI(title="CWA Weather Data Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    with get_connection() as conn:
        latest = conn.execute(
            "SELECT fetched_at, status, record_count FROM fetch_logs ORDER BY id DESC LIMIT 1"
        ).fetchone()
    return {
        "status": "ok",
        "latest_fetch": dict(latest) if latest else None,
    }


@app.post("/api/refresh")
def refresh_data():
    try:
        from crawler.service import run_crawler
        count = run_crawler()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/refresh/weather")
def refresh_weather_observations():
    try:
        from crawler.service import run_weather_observation_crawler
        count = run_weather_observation_crawler()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/refresh/pm25")
def refresh_pm25():
    try:
        from crawler.service import run_pm25_crawler
        count = run_pm25_crawler()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/counties")
def counties():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT county FROM forecasts WHERE county IS NOT NULL ORDER BY county"
        ).fetchall()
    return {"counties": [row["county"] for row in rows]}


@app.get("/api/stations")
def stations(county: str | None = None):
    sql = "SELECT * FROM stations"
    params: list[str] = []
    if county:
        sql += " WHERE county = ?"
        params.append(county)
    sql += " ORDER BY county, station_name"
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"count": len(rows), "stations": [dict(row) for row in rows]}


def _latest_rows(table: str, county: str | None = None) -> list[dict]:
    allowed_tables = {"weather_observations", "air_quality_observations"}
    if table not in allowed_tables:
        raise ValueError(f"Unsupported table: {table}")

    sql = f"SELECT * FROM {table} WHERE fetched_at = (SELECT MAX(fetched_at) FROM {table})"
    params: list[object] = []
    if county:
        sql += " AND county = ?"
        params.append(county)
    with get_connection() as conn:
        return [dict(row) for row in conn.execute(sql, params).fetchall()]


def _stats(values: list[float | None]) -> dict:
    valid = [value for value in values if value is not None]
    if not valid:
        return {"min": None, "max": None, "avg": None, "count": 0}
    return {
        "min": min(valid),
        "max": max(valid),
        "avg": sum(valid) / len(valid),
        "count": len(valid),
    }


def _circular_mean_degrees(values: list[float | None]) -> float | None:
    valid = [value for value in values if value is not None]
    if not valid:
        return None
    sin_sum = sum(math.sin(math.radians(value)) for value in valid)
    cos_sum = sum(math.cos(math.radians(value)) for value in valid)
    if sin_sum == 0 and cos_sum == 0:
        return None
    return (math.degrees(math.atan2(sin_sum, cos_sum)) + 360) % 360


@app.get("/api/weather/latest")
def latest_weather_observations(
    county: str | None = None,
    limit: int = Query(1000, ge=1, le=5000),
):
    rows = _latest_rows("weather_observations", county)
    return {"count": len(rows[:limit]), "observations": rows[:limit]}


@app.get("/api/weather/stations.geojson")
def weather_stations_geojson(county: str | None = None):
    rows = [
        row
        for row in _latest_rows("weather_observations", county)
        if row.get("lat") is not None and row.get("lon") is not None
    ]
    features = []
    for row in rows:
        lon = row.pop("lon")
        lat = row.pop("lat")
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": row,
            }
        )
    return {"type": "FeatureCollection", "features": features}


@app.get("/api/pm25/latest")
def latest_pm25(
    county: str | None = None,
    limit: int = Query(1000, ge=1, le=5000),
):
    rows = _latest_rows("air_quality_observations", county)
    return {"count": len(rows[:limit]), "observations": rows[:limit]}


@app.get("/api/summary/counties")
def county_summary():
    weather_rows = _latest_rows("weather_observations")
    pm25_rows = _latest_rows("air_quality_observations")
    counties_set = {
        row.get("county")
        for row in weather_rows + pm25_rows
        if row.get("county")
    }

    summaries = []
    for county in sorted(counties_set):
        county_weather = [row for row in weather_rows if row.get("county") == county]
        county_pm25 = [row for row in pm25_rows if row.get("county") == county]
        summaries.append(
            {
                "county": county,
                "weather_station_count": len(county_weather),
                "pm25_station_count": len(county_pm25),
                "temperature": _stats([row.get("temperature") for row in county_weather]),
                "rainfall": _stats([row.get("rainfall") for row in county_weather]),
                "wind_speed": _stats([row.get("wind_speed") for row in county_weather]),
                "wind_direction_avg": _circular_mean_degrees(
                    [row.get("wind_direction") for row in county_weather]
                ),
                "humidity": _stats([row.get("humidity") for row in county_weather]),
                "uv_index": _stats([row.get("uv_index") for row in county_weather]),
                "pm25": _stats([row.get("pm25") for row in county_pm25]),
                "pm25_avg": _stats([row.get("pm25_avg") for row in county_pm25]),
            }
        )
    return {"count": len(summaries), "summaries": summaries}


@app.get("/api/forecast/latest")
def latest_forecast(
    county: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
):
    sql = """
        SELECT * FROM forecasts
        WHERE fetched_at = (SELECT MAX(fetched_at) FROM forecasts)
    """
    params: list[object] = []
    if county:
        sql += " AND county = ?"
        params.append(county)
    sql += " ORDER BY county, forecast_start LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"count": len(rows), "forecasts": [dict(row) for row in rows]}


@app.get("/api/forecast/history")
def forecast_history(
    county: str | None = None,
    limit: int = Query(500, ge=1, le=5000),
):
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


@app.get("/api/temperature/geojson")
def temperature_geojson(county: str | None = None):
    sql = """
        SELECT s.lon, s.lat, s.station_name, f.*
        FROM (
            SELECT *, ROW_NUMBER() OVER(PARTITION BY station_id ORDER BY forecast_start ASC) as rn
            FROM forecasts
            WHERE fetched_at = (SELECT MAX(fetched_at) FROM forecasts)
        ) f
        LEFT JOIN stations s ON s.station_id = f.station_id
        WHERE f.rn = 1 AND s.lat IS NOT NULL AND s.lon IS NOT NULL
    """
    params: list[object] = []
    if county:
        sql += " AND f.county = ?"
        params.append(county)

    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()

    features = []
    for row in rows:
        data = dict(row)
        lon = data.pop("lon")
        lat = data.pop("lat")
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": data,
        })
    return {"type": "FeatureCollection", "features": features}
