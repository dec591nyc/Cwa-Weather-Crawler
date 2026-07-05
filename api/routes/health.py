from __future__ import annotations

from fastapi import APIRouter

from api.services.observation_service import get_health_status

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    return get_health_status()
