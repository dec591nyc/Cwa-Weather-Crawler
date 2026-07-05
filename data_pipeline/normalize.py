from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any

INVALID_VALUES = {"", "X", "NA", "null", "None", "-99", "-990", "-999", "-9999", None}
INVALID_NUMERIC_VALUES = {-99.0, -990.0, -999.0, -9999.0}


def parse_float(value: Any) -> float | None:
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
    if isinstance(weather_element, dict):
        value = get_first(weather_element, *names)
        if isinstance(value, dict):
            nested = get_first(value, "value", "Value", "Precipitation")
            return nested if nested is not None else value
        return value
    if isinstance(weather_element, list):
        wanted = {name.lower() for name in names}
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
        value = get_first(value, "Precipitation", "value", "Value")
    return parse_float(value)


def normalize_cwa_observations(raw_data: dict[str, Any], dataset_id: str) -> list[dict[str, Any]]:
    """Normalize CWA station observation datasets such as O-A0003-001/O-A0001-001."""
    fetched_at = now_iso()
    records = raw_data.get("records", {})
    stations = (
        records.get("Station")
        or records.get("station")
        or records.get("Stations")
        or records.get("stations")
        or []
    )
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
        if isinstance(obs_time, dict):
            observed_at = get_first(obs_time, "DateTime", "dateTime", "DataTime", "dataTime")
        else:
            observed_at = obs_time

        now_value = extract_weather_value(weather_element, "Now")
        rainfall = None
        if isinstance(now_value, dict):
            rainfall = parse_float(get_first(now_value, "Precipitation", "precipitation", "Value", "value"))
        else:
            rainfall = parse_float(now_value)
        if rainfall is None:
            rainfall = extract_rainfall_value(rainfall_element, weather_element, "Now", "Past10Min", "Precipitation")

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
                "rainfall": rainfall,
                "rainfall_10min": extract_rainfall_value(rainfall_element, weather_element, "Past10Min", "Past10MinRainfall"),
                "rainfall_1h": extract_rainfall_value(rainfall_element, weather_element, "Past1hr", "Past1Hour", "Past1Hr"),
                "rainfall_3h": extract_rainfall_value(rainfall_element, weather_element, "Past3hr", "Past3Hour", "Past3Hr"),
                "rainfall_6h": extract_rainfall_value(rainfall_element, weather_element, "Past6Hr", "Past6hr", "Past6Hour"),
                "rainfall_12h": extract_rainfall_value(rainfall_element, weather_element, "Past12hr", "Past12Hour", "Past12Hr"),
                "rainfall_24h": extract_rainfall_value(rainfall_element, weather_element, "Past24hr", "Past24Hour", "Past24Hr"),
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
    """Normalize MOENV air-quality records from aqx_p_432.

    AQI is ingested from the official MOENV `aqi` field. The project stores the
    published AQI and pollutant values; it does not recalculate AQI from PM2.5.
    """
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
        observed_at = get_first(
            record,
            "publishtime",
            "publish_time",
            "datacreationdate",
            "DataCreationDate",
            "monitordate",
            "monitor_time",
        )
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


def extract_element_value(values: list[dict[str, Any]]) -> dict[str, str]:
    """Helper to extract values from ElementValue list of dicts."""
    if not values or not isinstance(values, list):
        return {}
    item = values[0]
    if not isinstance(item, dict):
        return {}
    return {k.lower(): str(v) for k, v in item.items() if v is not None}


def normalize_f_d0047_091(raw_data: dict[str, Any], dataset_id: str) -> list[dict[str, Any]]:
    """Normalize CWA township weekly forecast dataset F-D0047-091/F-D0047-093.

    The CWA structure is nested by locations and weather elements. This flattens
    each location/time period into one record.
    """
    records: list[dict[str, Any]] = []
    fetched_at = now_iso()
    locations = raw_data.get("records", {}).get("Locations", raw_data.get("records", {}).get("locations", []))

    for location_group in locations:
        group_name = location_group.get("LocationsName") or location_group.get("locationsName")
        for location in location_group.get("Location", location_group.get("location", [])):
            county = location.get("LocationName") or location.get("locationName") or group_name
            geocode = location.get("Geocode") or location.get("geocode")
            lat = parse_float(location.get("Latitude") or location.get("latitude") or location.get("lat"))
            lon = parse_float(location.get("Longitude") or location.get("longitude") or location.get("lon"))

            weather_elements = location.get("WeatherElement", location.get("weatherElement", []))
            by_time: dict[tuple[str, str | None], dict[str, Any]] = {}

            for element in weather_elements:
                element_name = element.get("ElementName") or element.get("elementName")
                times = element.get("Time", element.get("time", []))
                for time_obj in times:
                    start_time = time_obj.get("StartTime") or time_obj.get("startTime") or time_obj.get("dataTime") or time_obj.get("DataTime")
                    end_time = time_obj.get("EndTime") or time_obj.get("endTime")
                    if not start_time:
                        continue
                    key = (start_time, end_time)
                    row = by_time.setdefault(
                        key,
                        {
                            "station_id": geocode,
                            "station_name": county,
                            "county": county,
                            "town": None,
                            "lat": lat,
                            "lon": lon,
                            "forecast_start": start_time,
                            "forecast_end": end_time,
                            "weather": None,
                            "weather_code": None,
                            "min_temp": None,
                            "max_temp": None,
                            "temperature": None,
                            "humidity": None,
                            "pop": None,
                            "wind_speed": None,
                            "wind_direction": None,
                            "source_dataset": dataset_id,
                            "fetched_at": fetched_at,
                        },
                    )

                    values = time_obj.get("ElementValue", time_obj.get("elementValue", []))
                    val_dict = extract_element_value(values)

                    if element_name in {"Wx", "天氣現象"}:
                        row["weather"] = val_dict.get("weather")
                        row["weather_code"] = val_dict.get("weathercode")
                    elif element_name in {"MinT", "最低溫度", "MinTemperature"}:
                        row["min_temp"] = parse_float(val_dict.get("mintemperature") or val_dict.get("value"))
                    elif element_name in {"MaxT", "最高溫度", "MaxTemperature"}:
                        row["max_temp"] = parse_float(val_dict.get("maxtemperature") or val_dict.get("value"))
                    elif element_name in {"T", "溫度", "Temperature", "平均溫度"}:
                        row["temperature"] = parse_float(val_dict.get("temperature") or val_dict.get("value"))
                    elif element_name in {"RH", "相對濕度", "RelativeHumidity", "平均相對濕度"}:
                        row["humidity"] = parse_float(val_dict.get("relativehumidity") or val_dict.get("value"))
                    elif element_name in {"PoP", "12小時降雨機率", "降雨機率", "ProbabilityOfPrecipitation"}:
                        row["pop"] = parse_float(val_dict.get("probabilityofprecipitation") or val_dict.get("value"))
                    elif element_name in {"WS", "風速", "WindSpeed"}:
                        row["wind_speed"] = parse_float(val_dict.get("windspeed") or val_dict.get("value"))
                    elif element_name in {"WD", "風向", "WindDirection"}:
                        row["wind_direction"] = val_dict.get("winddirection") or val_dict.get("value")

            for row in by_time.values():
                if row["weather"] or row["min_temp"] is not None or row["max_temp"] is not None:
                    records.append(row)

    return records
