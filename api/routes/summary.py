from __future__ import annotations

from fastapi import APIRouter

from api.services.observation_service import county_summary

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary/counties")
def counties_summary():
    return county_summary()
