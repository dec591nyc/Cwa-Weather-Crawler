from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass

from data_pipeline.service import (
    sync_auto_station_observations,
    sync_earthquake_observations,
    sync_forecasts,
    sync_pm25_observations,
    sync_rainfall_observations,
    sync_weather_observations,
)


@dataclass
class SyncResult:
    name: str
    status: str
    record_count: int = 0
    error: str | None = None


def run_sync_job(name: str, sync_func: Callable[[], int]) -> SyncResult:
    try:
        count = sync_func()
        return SyncResult(name=name, status="success", record_count=count)
    except Exception as exc:
        return SyncResult(name=name, status="failed", error=str(exc))


def sync_observation_sources() -> dict:
    jobs: list[tuple[str, Callable[[], int]]] = [
        ("weather", sync_weather_observations),
        ("auto_station", sync_auto_station_observations),
        ("rainfall", sync_rainfall_observations),
        ("air_quality", sync_pm25_observations),
        ("earthquake", sync_earthquake_observations),
    ]
    results = [run_sync_job(name, sync_func) for name, sync_func in jobs]
    failed = [result for result in results if result.status != "success"]
    return {
        "status": "partial_failed" if failed else "ok",
        "total_record_count": sum(result.record_count for result in results),
        "sources": [asdict(result) for result in results],
    }


def sync_all_sources() -> dict:
    jobs: list[tuple[str, Callable[[], int]]] = [
        ("forecast", sync_forecasts),
        ("weather", sync_weather_observations),
        ("auto_station", sync_auto_station_observations),
        ("rainfall", sync_rainfall_observations),
        ("air_quality", sync_pm25_observations),
        ("earthquake", sync_earthquake_observations),
    ]
    results = [run_sync_job(name, sync_func) for name, sync_func in jobs]
    failed = [result for result in results if result.status != "success"]
    return {
        "status": "partial_failed" if failed else "ok",
        "total_record_count": sum(result.record_count for result in results),
        "sources": [asdict(result) for result in results],
    }
