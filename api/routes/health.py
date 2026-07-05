from __future__ import annotations

from fastapi import APIRouter

from api.services.observation_service import get_health_status
from api.services.sync_status_service import latest_sync_status

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    return get_health_status()


@router.get("/sync/status")
def sync_status():
    return latest_sync_status()
