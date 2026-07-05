from __future__ import annotations

from fastapi import APIRouter, HTTPException

from data_pipeline.service import sync_earthquake_observations, sync_forecasts, sync_pm25_observations, sync_rainfall_observations, sync_weather_observations
from data_pipeline.sync_manager import sync_all_sources, sync_observation_sources

router = APIRouter(prefix="/api", tags=["refresh"])


def _run_sync(sync_func):
    try:
        count = sync_func()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh")
def refresh_forecasts():
    return _run_sync(sync_forecasts)


@router.post("/refresh/weather")
def refresh_weather_observations():
    return _run_sync(sync_weather_observations)


@router.post("/refresh/rainfall")
def refresh_rainfall_observations():
    return _run_sync(sync_rainfall_observations)


@router.post("/refresh/pm25")
def refresh_pm25():
    return _run_sync(sync_pm25_observations)


@router.post("/refresh/air-quality")
def refresh_air_quality():
    return _run_sync(sync_pm25_observations)


@router.post("/refresh/earthquakes")
def refresh_earthquakes():
    return _run_sync(sync_earthquake_observations)


@router.post("/refresh/observations")
def refresh_observation_sources():
    return sync_observation_sources()


@router.post("/refresh/all")
def refresh_all_sources():
    return sync_all_sources()
