from __future__ import annotations

from fastapi import APIRouter, Query

from api.services.observation_service import (
    latest_weather_observations,
    list_counties,
    list_stations,
    weather_stations_geojson,
)

router = APIRouter(prefix="/api", tags=["weather"])


@router.get("/counties")
def counties():
    return list_counties()


@router.get("/stations")
def stations(county: str | None = None):
    return list_stations(county)


@router.get("/weather/latest")
def latest_weather(
    county: str | None = None,
    limit: int = Query(1000, ge=1, le=5000),
):
    return latest_weather_observations(county, limit)


@router.get("/weather/stations.geojson")
def stations_geojson(county: str | None = None):
    return weather_stations_geojson(county)
