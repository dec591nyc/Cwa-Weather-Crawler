from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import air_quality, forecast, health, refresh, summary, weather

app = FastAPI(title="CWA GeoMap Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(refresh.router)
app.include_router(weather.router)
app.include_router(air_quality.router)
app.include_router(summary.router)
app.include_router(forecast.router)
