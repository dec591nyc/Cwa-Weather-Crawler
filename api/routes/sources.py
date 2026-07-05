from __future__ import annotations

from fastapi import APIRouter

from api.services.source_catalog import list_api_sources

router = APIRouter(prefix="/api", tags=["sources"])


@router.get("/data-sources")
def read_sources():
    return list_api_sources()
