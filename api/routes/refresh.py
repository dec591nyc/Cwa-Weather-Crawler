from __future__ import annotations

from fastapi import APIRouter, HTTPException

from data_pipeline.service import sync_forecasts, sync_pm25_observations, sync_rainfall_observations, sync_weather_observations
from data_pipeline.sync_manager import sync_all_sources, sync_observation_sources

router = APIRouter(prefix="/api", tags=["refresh"])


@router.post("/refresh")
def refresh_forecasts():
    try:
        count = sync_forecasts()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh/weather")
def refresh_weather_observations():
    try:
        count = sync_weather_observations()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh/rainfall")
def refresh_rainfall_observations():
    try:
        count = sync_rainfall_observations()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh/pm25")
def refresh_pm25():
    try:
        count = sync_pm25_observations()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh/air-quality")
def refresh_air_quality():
    try:
        count = sync_pm25_observations()
        return {"status": "ok", "record_count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh/observations")
def refresh_observation_sources():
    result = sync_observation_sources()
    if result["status"] == "partial_failed":
        raise HTTPException(status_code=500, detail=result)
    return result


@router.post("/refresh/all")
def refresh_all_sources():
    result = sync_all_sources()
    if result["status"] == "partial_failed":
        raise HTTPException(status_code=500, detail=result)
    return result
