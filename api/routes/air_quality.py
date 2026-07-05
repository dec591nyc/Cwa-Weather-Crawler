from __future__ import annotations

from fastapi import APIRouter, Query

from api.services.observation_service import latest_pm25_observations

router = APIRouter(prefix="/api", tags=["air-quality"])


@router.get("/pm25/latest")
def latest_pm25(
    county: str | None = None,
    limit: int = Query(1000, ge=1, le=5000),
):
    return latest_pm25_observations(county, limit)


@router.get("/air-quality/latest")
def latest_air_quality(
    county: str | None = None,
    limit: int = Query(1000, ge=1, le=5000),
):
    return latest_pm25_observations(county, limit)
