from __future__ import annotations

from typing import Any

from data_pipeline.normalize import get_first, now_iso, parse_float, parse_text


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _safe_key(dataset_id: str, earthquake: dict[str, Any], index: int) -> str:
    number = get_first(earthquake, "EarthquakeNo", "earthquakeNo", "EarthquakeID", "EarthquakeId")
    if number:
        return str(number)
    info = get_first(earthquake, "EarthquakeInfo", "earthquakeInfo")
    origin_time = get_first(info, "OriginTime", "originTime") if isinstance(info, dict) else None
    content = get_first(earthquake, "ReportContent", "reportContent")
    return f"{dataset_id}-{origin_time or 'unknown'}-{str(content or index)[:28]}"


def normalize_cwa_earthquakes(raw_data: dict[str, Any], dataset_id: str) -> dict[str, list[dict[str, Any]]]:
    fetched_at = now_iso()
    records = raw_data.get("records", {}) if isinstance(raw_data, dict) else {}
    earthquakes = records.get("Earthquake") or records.get("earthquake") or []
    if isinstance(earthquakes, dict):
        earthquakes = [earthquakes]

    events: list[dict[str, Any]] = []
    stations: list[dict[str, Any]] = []

    for index, earthquake in enumerate(earthquakes):
        if not isinstance(earthquake, dict):
            continue
        info = get_first(earthquake, "EarthquakeInfo", "earthquakeInfo")
        info = info if isinstance(info, dict) else {}
        epicenter = get_first(info, "Epicenter", "epicenter")
        epicenter = epicenter if isinstance(epicenter, dict) else {}
        magnitude = get_first(info, "EarthquakeMagnitude", "earthquakeMagnitude")
        magnitude = magnitude if isinstance(magnitude, dict) else {}
        intensity = get_first(earthquake, "Intensity", "intensity")
        intensity = intensity if isinstance(intensity, dict) else {}
        shaking_areas = _as_list(get_first(intensity, "ShakingArea", "shakingArea"))
        earthquake_key = _safe_key(dataset_id, earthquake, index)

        max_intensity = parse_text(get_first(intensity, "MaxIntensity", "maxIntensity"))
        if not max_intensity:
            for area in shaking_areas:
                if isinstance(area, dict):
                    candidate = parse_text(get_first(area, "AreaIntensity", "areaIntensity", "MaxIntensity"))
                    if candidate and not max_intensity:
                        max_intensity = candidate

        event = {
            "earthquake_key": earthquake_key,
            "source_dataset": dataset_id,
            "report_type": parse_text(get_first(earthquake, "ReportType", "reportType")),
            "report_color": parse_text(get_first(earthquake, "ReportColor", "reportColor")),
            "report_content": parse_text(get_first(earthquake, "ReportContent", "reportContent")),
            "report_image_uri": parse_text(get_first(earthquake, "ReportImageURI", "ReportImageUrl", "reportImageURI")),
            "web_uri": parse_text(get_first(earthquake, "Web", "web", "WebURI", "webURI")),
            "earthquake_time": parse_text(get_first(info, "OriginTime", "originTime", "DateTime", "dateTime")),
            "magnitude_type": parse_text(get_first(magnitude, "MagnitudeType", "magnitudeType")),
            "magnitude_value": parse_float(get_first(magnitude, "MagnitudeValue", "magnitudeValue")),
            "depth_km": parse_float(get_first(info, "FocalDepth", "focalDepth", "Depth", "depth")),
            "location": parse_text(get_first(epicenter, "Location", "location")),
            "epicenter_lat": parse_float(get_first(epicenter, "EpicenterLatitude", "epicenterLatitude", "Latitude", "latitude")),
            "epicenter_lon": parse_float(get_first(epicenter, "EpicenterLongitude", "epicenterLongitude", "Longitude", "longitude")),
            "max_intensity": max_intensity,
            "fetched_at": fetched_at,
        }
        if event["epicenter_lat"] is not None and event["epicenter_lon"] is not None:
            events.append(event)

        for area in shaking_areas:
            if not isinstance(area, dict):
                continue
            area_name = parse_text(get_first(area, "AreaDesc", "areaDesc", "AreaName", "areaName"))
            county = parse_text(get_first(area, "CountyName", "countyName")) or area_name
            area_intensity = parse_text(get_first(area, "AreaIntensity", "areaIntensity"))
            for station in _as_list(get_first(area, "EqStation", "eqStation")):
                if not isinstance(station, dict):
                    continue
                station_lat = parse_float(get_first(station, "StationLatitude", "stationLatitude", "Latitude", "latitude"))
                station_lon = parse_float(get_first(station, "StationLongitude", "stationLongitude", "Longitude", "longitude"))
                if station_lat is None or station_lon is None:
                    continue
                stations.append(
                    {
                        "earthquake_key": earthquake_key,
                        "source_dataset": dataset_id,
                        "area_name": area_name,
                        "county": county,
                        "station_name": parse_text(get_first(station, "StationName", "stationName")),
                        "station_lat": station_lat,
                        "station_lon": station_lon,
                        "station_intensity": parse_text(get_first(station, "StationIntensity", "stationIntensity")) or area_intensity,
                        "distance_km": parse_float(get_first(station, "Distance", "distance")),
                        "pga": parse_float(get_first(station, "PGA", "pga")),
                        "pgv": parse_float(get_first(station, "PGV", "pgv")),
                        "fetched_at": fetched_at,
                    }
                )

    return {"events": events, "stations": stations}
