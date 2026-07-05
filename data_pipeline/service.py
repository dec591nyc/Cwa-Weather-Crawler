from __future__ import annotations

from config import settings
from data_pipeline.cwa_client import CwaClient
from data_pipeline.moenv_client import MoenvClient
from data_pipeline.normalize import normalize_cwa_observations, normalize_f_d0047_091, normalize_moenv_pm25, now_iso
from data_pipeline.repository import (
    log_fetch,
    save_air_quality_observations,
    save_forecasts,
    save_raw_snapshot,
    save_weather_observations,
)


def sync_forecasts() -> int:
    fetched_at = now_iso()
    client = CwaClient(settings.cwa_api_key, settings.cwa_dataset_id)
    try:
        raw_data, response_ms = client.fetch()
        records = normalize_f_d0047_091(raw_data, settings.cwa_dataset_id)
        save_raw_snapshot(settings.cwa_dataset_id, raw_data, fetched_at)
        count = save_forecasts(records)
        log_fetch(settings.cwa_dataset_id, fetched_at, "success", count, response_ms)
        return count
    except Exception as exc:
        log_fetch(settings.cwa_dataset_id, fetched_at, "failed", 0, None, str(exc))
        raise


def sync_weather_observations() -> int:
    fetched_at = now_iso()
    dataset_id = settings.cwa_observation_dataset_id
    client = CwaClient(settings.cwa_api_key, dataset_id)
    params = {
        "WeatherElement": [
            "Weather",
            "Now",
            "WindDirection",
            "WindSpeed",
            "AirTemperature",
            "RelativeHumidity",
            "UVIndex",
            "DailyHigh",
            "DailyLow",
        ],
        "GeoInfo": [
            "Coordinates",
            "StationAltitude",
            "CountyName",
            "TownName",
            "CountyCode",
            "TownCode",
        ],
    }
    try:
        raw_data, response_ms = client.fetch(params)
        records = normalize_cwa_observations(raw_data, dataset_id)
        save_raw_snapshot(dataset_id, raw_data, fetched_at)
        count = save_weather_observations(records)
        log_fetch(dataset_id, fetched_at, "success", count, response_ms)
        return count
    except Exception as exc:
        log_fetch(dataset_id, fetched_at, "failed", 0, None, str(exc))
        raise


def sync_pm25_observations() -> int:
    fetched_at = now_iso()
    dataset_id = settings.moenv_pm25_dataset_id
    client = MoenvClient(settings.moenv_api_key, dataset_id)
    try:
        raw_data, response_ms = client.fetch()
        records = normalize_moenv_pm25(raw_data, dataset_id)
        save_raw_snapshot(dataset_id, raw_data, fetched_at)
        count = save_air_quality_observations(records)
        log_fetch(dataset_id, fetched_at, "success", count, response_ms)
        return count
    except Exception as exc:
        log_fetch(dataset_id, fetched_at, "failed", 0, None, str(exc))
        raise
