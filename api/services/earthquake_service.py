from __future__ import annotations

from datetime import datetime, timedelta

from database.connection import get_connection

RECENT_EARTHQUAKE_DAYS = 7
NUMERIC_FIELDS = {"magnitude_value", "depth_km", "epicenter_lat", "epicenter_lon", "station_lat", "station_lon", "distance_km", "pga", "pgv"}


def _parse_time(value: object) -> datetime | None:
    if value is None:
        return None
    text = str(value).replace("T", " ").replace("Z", "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M"):
        try:
            return datetime.strptime(text[:19], fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _is_recent(value: object, days: int = RECENT_EARTHQUAKE_DAYS) -> bool:
    parsed = _parse_time(value)
    if parsed is None:
        return False
    return parsed >= datetime.now() - timedelta(days=days)


def _clean_row(row: dict) -> dict:
    for field in NUMERIC_FIELDS:
        if field in row and row[field] is not None:
            try:
                row[field] = float(row[field])
            except (TypeError, ValueError):
                pass
    return row


def _stations_for_event(source_dataset: str, event_key: str) -> list[dict]:
    sql = "SELECT * FROM earthquake_station_intensities WHERE source_dataset = ? AND earthquake_key = ? ORDER BY area_name, station_name"
    with get_connection() as conn:
        rows = conn.execute(sql, (source_dataset, event_key)).fetchall()
    return [_clean_row(dict(row)) for row in rows]


def latest_earthquakes(limit: int = 20, source_dataset: str | None = None, min_magnitude: float | None = None) -> dict:
    sql = "SELECT * FROM earthquake_events WHERE epicenter_lat IS NOT NULL AND epicenter_lon IS NOT NULL"
    params: list[object] = []
    if source_dataset:
        sql += " AND source_dataset = ?"
        params.append(source_dataset)
    sql += " ORDER BY earthquake_time DESC, id DESC LIMIT ?"
    params.append(max(limit * 4, 100))
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    events = []
    for row in rows:
        event = _clean_row(dict(row))
        if not _is_recent(event.get("earthquake_time")):
            continue
        magnitude = event.get("magnitude_value")
        if min_magnitude is not None and (not isinstance(magnitude, (int, float)) or magnitude < min_magnitude):
            continue
        event["stations"] = _stations_for_event(event["source_dataset"], event["earthquake_key"])
        event["station_count"] = len(event["stations"])
        events.append(event)
        if len(events) >= limit:
            break
    return {"count": len(events), "earthquakes": events, "days": RECENT_EARTHQUAKE_DAYS}


def earthquake_epicenters_geojson(limit: int = 50, min_magnitude: float | None = None) -> dict:
    events = latest_earthquakes(limit=limit, min_magnitude=min_magnitude)["earthquakes"]
    features = []
    for event in events:
        lon = event.get("epicenter_lon")
        lat = event.get("epicenter_lat")
        if lon is None or lat is None:
            continue
        props = {key: value for key, value in event.items() if key not in {"epicenter_lon", "epicenter_lat", "stations"}}
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": props})
    return {"type": "FeatureCollection", "features": features}
