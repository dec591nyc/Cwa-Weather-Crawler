from __future__ import annotations

from fastapi import APIRouter, Query

from api.services.observation_service import forecast_history, latest_forecast

router = APIRouter(prefix="/api", tags=["forecast"])


@router.get("/forecast/latest")
def forecast_latest(
    county: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
):
    return latest_forecast(county, limit)


@router.get("/forecast/history")
def forecast_history_endpoint(
    county: str | None = None,
    limit: int = Query(500, ge=1, le=5000),
):
    return forecast_history(county, limit)
