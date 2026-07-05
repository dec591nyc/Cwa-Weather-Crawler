from __future__ import annotations

from fastapi import APIRouter, Query

from api.services.earthquake_service import earthquake_epicenters_geojson, latest_earthquakes

router = APIRouter(prefix="/api", tags=["earthquakes"])


@router.get("/earthquakes/latest")
def get_latest_earthquakes(
    limit: int = Query(default=20, ge=1, le=100),
    source_dataset: str | None = None,
    min_magnitude: float | None = Query(default=None, ge=0, le=10),
):
    return latest_earthquakes(limit=limit, source_dataset=source_dataset, min_magnitude=min_magnitude)


@router.get("/earthquakes/epicenters.geojson")
def get_earthquake_epicenters(
    limit: int = Query(default=50, ge=1, le=200),
    min_magnitude: float | None = Query(default=None, ge=0, le=10),
):
    return earthquake_epicenters_geojson(limit=limit, min_magnitude=min_magnitude)
