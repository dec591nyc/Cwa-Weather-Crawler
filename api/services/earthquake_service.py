from __future__ import annotations

from database.connection import get_connection

NUMERIC_FIELDS = {"magnitude_value", "depth_km", "epicenter_lat", "epicenter_lon", "station_lat", "station_lon", "distance_km", "pga", "pgv"}


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


def latest_earthquakes(limit: int = 20, source_dataset: str | None = None) -> dict:
    sql = "SELECT * FROM earthquake_events WHERE epicenter_lat IS NOT NULL AND epicenter_lon IS NOT NULL"
    params: list[object] = []
    if source_dataset:
        sql += " AND source_dataset = ?"
        params.append(source_dataset)
    sql += " ORDER BY earthquake_time DESC, id DESC LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    events = []
    for row in rows:
        event = _clean_row(dict(row))
        event["stations"] = _stations_for_event(event["source_dataset"], event["earthquake_key"])
        event["station_count"] = len(event["stations"])
        events.append(event)
    return {"count": len(events), "earthquakes": events}


def earthquake_epicenters_geojson(limit: int = 50) -> dict:
    events = latest_earthquakes(limit=limit)["earthquakes"]
    features = []
    for event in events:
        lon = event.get("epicenter_lon")
        lat = event.get("epicenter_lat")
        if lon is None or lat is None:
            continue
        props = {key: value for key, value in event.items() if key not in {"epicenter_lon", "epicenter_lat", "stations"}}
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": props})
    return {"type": "FeatureCollection", "features": features}
