from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any

INVALID_VALUES = {"", "X", "NA", "null", "None", "-99", "-990", "-999", "-9999", None}
INVALID_NUMERIC_VALUES = {-99.0, -990.0, -999.0, -9999.0}


def parse_float(value: Any) -> float | None:
    if isinstance(value, (dict, list)):
        return None
    if value in INVALID_VALUES:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed in INVALID_NUMERIC_VALUES:
        return None
    return parsed


def parse_text(value: Any) -> str | None:
    if isinstance(value, (dict, list)):
        return None
    if value in INVALID_VALUES:
        return None
    text = str(value).strip()
    return text or None


def parse_visibility_km(value: Any) -> float | None:
    parsed = parse_float(value)
    if parsed is not None:
        return parsed
    text = parse_text(value)
    if not text:
        return None
    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None
    return parse_float(match.group(0))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_first(data: dict[str, Any], *keys: str) -> Any:
    if not isinstance(data, dict):
        return None
    lowered = {str(k).lower(): v for k, v in data.items()}
    for key in keys:
        value = lowered.get(key.lower())
        if isinstance(value, (dict, list)):
            return value
        if value not in INVALID_VALUES:
            return value
    return None


def parse_coordinates(geo_info: dict[str, Any] | None, station: dict[str, Any]) -> tuple[float | None, float | None]:
    lat = parse_float(get_first(station, "lat", "latitude", "StationLatitude"))
    lon = parse_float(get_first(station, "lon", "lng", "longitude", "StationLongitude"))
    if lat is not None and lon is not None:
        return lat, lon
    if not isinstance(geo_info, dict):
        return lat, lon
    lat = parse_float(get_first(geo_info, "lat", "latitude", "StationLatitude"))
    lon = parse_float(get_first(geo_info, "lon", "lng", "longitude", "StationLongitude"))
    coordinates = get_first(geo_info, "Coordinates", "coordinates")
    if isinstance(coordinates, list):
        for item in coordinates:
            if not isinstance(item, dict):
                continue
            name = str(get_first(item, "CoordinateName", "coordinateName") or "").lower()
            item_lat = parse_float(get_first(item, "StationLatitude", "latitude", "lat"))
            item_lon = parse_float(get_first(item, "StationLongitude", "longitude", "lon"))
            if item_lat is None or item_lon is None:
                continue
            if "wgs" in name or lat is None or lon is None:
                return item_lat, item_lon
    return lat, lon


def extract_weather_value(weather_element: Any, *names: str) -> Any:
    if not weather_element:
        return None
    wanted = {name.lower() for name in names}
    if isinstance(weather_element, dict):
        return get_first(weather_element, *names)
    if isinstance(weather_element, list):
        for item in weather_element:
            if not isinstance(item, dict):
                continue
            item_name = str(get_first(item, "ElementName", "elementName", "Name", "name") or "").lower()
            if item_name not in wanted:
                continue
            value = get_first(item, "ElementValue", "elementValue", "Value", "value")
            if isinstance(value, list) and value:
                first = value[0]
                if isinstance(first, dict):
                    return get_first(first, "value", "Value", "Precipitation") or first
                return first
            return value
    return None


def extract_rainfall_value(rainfall_element: Any, weather_element: Any, *names: str) -> float | None:
    value = extract_weather_value(rainfall_element, *names)
    if value is None:
        value = extract_weather_value(weather_element, *names)
    if isinstance(value, dict):
        value = get_first(value, "Precipitation", "precipitation", "value", "Value")
    return parse_float(value)


def normalize_cwa_observations(raw_data: dict[str, Any], dataset_id: str) -> list[dict[str, Any]]:
    fetched_at = now_iso()
    records = raw_data.get("records", {})
    stations = records.get("Station") or records.get("station") or records.get("Stations") or records.get("stations") or []
    if isinstance(stations, dict):
        stations = [stations]
    normalized: list[dict[str, Any]] = []
    for station in stations:
        if not isinstance(station, dict):
            continue
        geo_info = get_first(station, "GeoInfo", "geoInfo")
        if not isinstance(geo_info, dict):
            geo_info = {}
        weather_element = get_first(station, "WeatherElement", "weatherElement")
        rainfall_element = get_first(station, "RainfallElement", "rainfallElement")
        obs_time = get_first(station, "ObsTime", "obsTime")
        observed_at = get_first(obs_time, "DateTime", "dateTime", "DataTime", "dataTime") if isinstance(obs_time, dict) else obs_time
        rainfall_now = extract_rainfall_value(rainfall_element, weather_element, "Now", "Precipitation")
        rainfall_10min = extract_rainfall_value(rainfall_element, weather_element, "Past10Min", "Past10min", "Past10Minutes")
        rainfall_1h = extract_rainfall_value(rainfall_element, weather_element, "Past1hr", "Past1Hour", "Past1Hr", "HourRainfall")
        rainfall_24h = extract_rainfall_value(rainfall_element, weather_element, "Past24hr", "Past24Hour", "Past24Hr", "Past24Hours", "Hour24Rainfall")
        visibility_raw = extract_weather_value(weather_element, "Visibility", "VisibilityDescription")
        lat, lon = parse_coordinates(geo_info, station)
        station_id = get_first(station, "StationId", "StationID", "stationId", "stationID")
        station_name = get_first(station, "StationName", "stationName")
        if not station_id and not station_name:
            continue
        normalized.append(
            {
                "station_id": str(station_id or station_name),
                "station_name": str(station_name or station_id),
                "county": get_first(geo_info, "CountyName", "countyName") or get_first(station, "CountyName", "county"),
                "town": get_first(geo_info, "TownName", "townName") or get_first(station, "TownName", "town"),
                "lat": lat,
                "lon": lon,
                "altitude_m": parse_float(get_first(geo_info, "StationAltitude", "stationAltitude")),
                "observed_at": str(observed_at) if observed_at else None,
                "temperature": parse_float(extract_weather_value(weather_element, "AirTemperature", "Temperature")),
                "rainfall": rainfall_now,
                "rainfall_10min": rainfall_10min,
                "rainfall_1h": rainfall_1h,
                "rainfall_24h": rainfall_24h,
                "wind_speed": parse_float(extract_weather_value(weather_element, "WindSpeed")),
                "wind_direction": parse_float(extract_weather_value(weather_element, "WindDirection")),
                "humidity": parse_float(extract_weather_value(weather_element, "RelativeHumidity", "Humidity")),
                "visibility_km": parse_visibility_km(visibility_raw),
                "visibility_description": parse_text(visibility_raw),
                "uv_index": parse_float(extract_weather_value(weather_element, "UVIndex")),
                "daily_high": parse_float(extract_weather_value(weather_element, "DailyHigh")),
                "daily_low": parse_float(extract_weather_value(weather_element, "DailyLow")),
                "weather": str(extract_weather_value(weather_element, "Weather") or "") or None,
                "source_dataset": dataset_id,
                "fetched_at": fetched_at,
            }
        )
    return normalized
def normalize_moenv_pm25(raw_data: dict[str, Any] | list[Any], dataset_id: str) -> list[dict[str, Any]]:
    fetched_at = now_iso()
    records = raw_data.get("records", []) if isinstance(raw_data, dict) else raw_data
    if isinstance(records, dict):
        records = [records]
    normalized: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        station_name = get_first(record, "sitename", "site_name", "SiteName", "station_name")
        station_id = get_first(record, "siteid", "site_id", "SiteId", "station_id")
        if not station_name and not station_id:
            continue
        observed_at = get_first(record, "publishtime", "publish_time", "datacreationdate", "DataCreationDate", "monitordate", "monitor_time")
        normalized.append(
            {
                "station_id": str(station_id or station_name),
                "station_name": str(station_name or station_id),
                "county": get_first(record, "county", "County"),
                "lat": parse_float(get_first(record, "latitude", "lat", "Latitude", "twd97lat")),
                "lon": parse_float(get_first(record, "longitude", "lon", "lng", "Longitude", "twd97lon")),
                "observed_at": str(observed_at) if observed_at else None,
                "aqi": parse_float(get_first(record, "aqi", "AQI")),
                "status": parse_text(get_first(record, "status", "Status")),
                "pollutant": parse_text(get_first(record, "pollutant", "Pollutant")),
                "pm25": parse_float(get_first(record, "pm2.5", "pm25", "PM2.5", "PM25")),
                "pm25_avg": parse_float(get_first(record, "pm2.5_avg", "pm25_avg", "PM2.5_AVG", "PM25_AVG")),
                "pm10": parse_float(get_first(record, "pm10", "PM10")),
                "pm10_avg": parse_float(get_first(record, "pm10_avg", "PM10_AVG")),
                "so2": parse_float(get_first(record, "so2", "SO2")),
                "co": parse_float(get_first(record, "co", "CO")),
                "co_8hr": parse_float(get_first(record, "co_8hr", "CO_8hr", "CO_8HR")),
                "o3": parse_float(get_first(record, "o3", "O3")),
                "o3_8hr": parse_float(get_first(record, "o3_8hr", "O3_8hr", "O3_8HR")),
                "no2": parse_float(get_first(record, "no2", "NO2")),
                "nox": parse_float(get_first(record, "nox", "NOx", "NOX")),
                "no": parse_float(get_first(record, "no", "NO")),
                "source_dataset": dataset_id,
                "fetched_at": fetched_at,
            }
        )
    return normalized
