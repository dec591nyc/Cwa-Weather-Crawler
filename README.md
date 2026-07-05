# CWA Weather Crawler

A Taiwan real-time weather and air-quality dashboard built with FastAPI, SQLite, React, Vite, MapLibre, OpenStreetMap, and Windy Map Forecast API.

The project collects and normalizes observation data from Taiwan's Central Weather Administration and the Ministry of Environment, then visualizes station-level weather and PM2.5 data on an interactive dashboard.

## Live Demo

[Open live demo](https://cwa-weather-crawler.vercel.app)

Backend health check: [Render FastAPI health endpoint](https://cwa-weather-crawler.onrender.com/api/health)

## Features

- Real-time CWA weather station observations.
- MOENV PM2.5 station observations.
- County-level summary statistics.
- OSM mode powered by MapLibre and OpenStreetMap.
- Windy mode with CWA / MOENV station markers over Windy wind-field visualization.
- Shared observation controls for OSM and Windy modes.
- Metric switching for temperature, rainfall, humidity, wind speed, and PM2.5.
- Metric threshold filtering, county filtering, station popups, legends, and ranking panels.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Backend | FastAPI, Python, SQLite |
| Data collection | CWA Open Data API, MOENV Open Data API |
| Frontend | React, TypeScript, Vite |
| Map | MapLibre GL, OpenStreetMap, Windy Map Forecast API |
| Deployment | Render, Vercel |

## Project Structure

```text
api/          FastAPI endpoints
crawler/      CWA/MOENV clients, normalization, persistence service
database/     SQLite connection, schema, init code
data/         local runtime data, ignored by git
docs/         planning and deployment notes
frontend/     React/Vite dashboard
scripts/      CLI entry points and validation scripts
```

## Data Sources

| Source | Dataset | Usage |
| --- | --- | --- |
| CWA | `O-A0003-001` | Weather station observations |
| MOENV | `aqx_p_432` | PM2.5 observations |
| OSM | OpenStreetMap tiles | Base map in OSM mode |
| Windy | Map Forecast API | Wind-field background in Windy mode |

Windy is used as a visual map layer. Station values, rankings, and summaries are generated from backend-normalized CWA and MOENV data.

## API Keys

CWA and MOENV keys belong on the backend only. They should never be exposed in frontend code.

Windy Map Forecast API is loaded by the browser, so `VITE_WINDY_API_KEY` is a frontend variable. Use Windy domain authorization to restrict where the key can run.

Recommended sources:

| Key | Purpose |
| --- | --- |
| `CWA_API_KEY` | Central Weather Administration Open Data API |
| `MOENV_API_KEY` | Ministry of Environment Open Data API |
| `VITE_WINDY_API_KEY` | Windy Map Forecast API |

## Environment Variables

Copy the example file first:

```powershell
copy .env.example .env
```

Current `.env.example` layout:

```env
# Frontend
VITE_API_BASE_URL=
VITE_WINDY_API_KEY=your_windy_map_forecast_key_here

# Backend
CWA_API_KEY=your_cwa_api_key_here
CWA_DATASET_ID=F-D0047-091
CWA_OBSERVATION_DATASET_ID=O-A0003-001
MOENV_API_KEY=your_moenv_api_key_here
MOENV_PM25_DATASET_ID=aqx_p_432
DATABASE_PATH=data/weather.db
RAW_DATA_DIR=data/raw
```

For local frontend development, `VITE_API_BASE_URL` can stay empty if Vite proxies or local requests are configured for the same origin. For cloud deployment, set it to the backend URL, for example:

```env
VITE_API_BASE_URL=https://cwa-weather-crawler.onrender.com
```

## Quick Start

Install backend dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Initialize the database and load the first batch of data:

```powershell
py scripts/init_db.py
py scripts/run_weather_observations.py
py scripts/run_pm25.py
```

Start the FastAPI backend:

```powershell
uvicorn api.main:app --reload
```

In another terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Useful backend checks:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/summary/counties
Invoke-RestMethod http://127.0.0.1:8000/api/weather/stations.geojson
Invoke-RestMethod http://127.0.0.1:8000/api/pm25/latest
```

## API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/health` | GET | Service status and latest fetch metadata |
| `/api/weather/stations.geojson` | GET | CWA weather station observations as GeoJSON |
| `/api/pm25/latest` | GET | Latest MOENV PM2.5 observations |
| `/api/summary/counties` | GET | County-level weather and PM2.5 summaries |
| `/api/refresh/weather` | POST | Refresh CWA weather observations |
| `/api/refresh/pm25` | POST | Refresh MOENV PM2.5 observations |

Refresh endpoints are useful for MVP demos and scheduled jobs. Before public production usage, add token-based protection so crawlers cannot be triggered by anyone.

## Deployment

The current MVP uses separated deployment:

| Layer | Platform | Notes |
| --- | --- | --- |
| Frontend | Vercel | Set `VITE_API_BASE_URL` and `VITE_WINDY_API_KEY` |
| Backend | Render | Set CWA/MOENV keys and persistent SQLite paths |
| Database | Render Persistent Disk | Store `weather.db` and raw snapshots |
| Scheduler | GitHub Actions or cron service | Call refresh endpoints periodically |

Detailed deployment notes are available in [docs/cloud_deployment.md](docs/cloud_deployment.md).

## Roadmap

- Add UV index layers and rankings.
- Expand air-quality indicators, including PM10, O3, NO2, SO2, CO, and AQI.
- Add multi-metric alert thresholds for heat, strong wind, heavy rainfall, high UV, and poor air quality.
- Build historical time-series views after more data is collected.
- Add admin-only refresh controls and protected refresh endpoints.
- Improve visual comparison between counties, stations, and time windows.

## Development Notes

- Windy is useful as a wind-field visualization layer, but CWA/MOENV backend data should remain the source of truth for station values, rankings, and summaries.
- Observation dashboards need to distinguish `observed_at` from `fetched_at`; users care about when the measurement happened, not only when the system synced it.
- Public API data can include missing values and sentinel values such as `-99` or `-999`; normalization should happen before data reaches the map layer.
- OSM and Windy modes should share the same observation state, filters, thresholds, and legends so users do not need to relearn the interface.
- Cloud deployment needs separate frontend and backend environment variables, especially `VITE_API_BASE_URL`, backend API keys, and Windy domain authorization.
