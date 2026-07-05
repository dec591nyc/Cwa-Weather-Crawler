# CWA Weather Crawler

## 專案介紹

本專案旨在整合台灣政府開放資料與地圖服務，將氣候、空氣品質與環境觀測資料轉化為可互動的視覺化儀表板。使用者可以透過地圖快速查看各地測站狀態，並以指標切換、縣市篩選與門檻控制掌握不同區域的環境變化。

目前版本以氣象觀測與空氣品質資料作為核心資料來源，並結合 OpenStreetMap 與 Windy 風場視覺化，建立一個可持續擴充的台灣環境資訊 dashboard。後續可延伸至 UV、AQI、降雨警戒、極端天氣提示與長期趨勢分析。

## 專案連結

| 項目 | 連結 |
| --- | --- |
| 線上展示 | [cwa-weather-crawler.vercel.app](https://cwa-weather-crawler.vercel.app) |
| 後端健康檢查 | [Render FastAPI `/api/health`](https://cwa-weather-crawler.onrender.com/api/health) |
| 雲端部署文件 | [docs/cloud_deployment.md](docs/cloud_deployment.md) |

## 核心功能

- 以地圖呈現台灣各地環境觀測資料。
- 支援 OSM 與 Windy 兩種地圖模式。
- 支援氣溫、降水量、濕度、風速、PM2.5 等觀測指標切換。
- 支援縣市篩選與指標門檻篩選。
- 支援測站 popup、顏色級距圖例與縣市摘要。
- 後端負責 API 串接、資料清洗、缺值處理與統一輸出格式。

## 技術架構

| 層級 | 使用技術 |
| --- | --- |
| 後端 | FastAPI, Python, SQLite |
| 資料處理 | CWA Open Data API, MOENV Open Data API |
| 前端 | React, TypeScript, Vite |
| 地圖視覺化 | MapLibre GL, OpenStreetMap, Windy Map Forecast API |
| 雲端部署 | Render, Vercel |

## 資料來源

| 資料來源 | Dataset / 服務 | 用途 |
| --- | --- | --- |
| 中央氣象署 CWA | `O-A0003-001` | 氣象觀測資料 |
| 環境部 MOENV | `aqx_p_432` | PM2.5 空氣品質資料 |
| OpenStreetMap | Map tiles | OSM 模式地圖底圖 |
| Windy | Map Forecast API | Windy 模式風場背景 |

Windy 主要作為風場視覺化背景；測站數值、縣市摘要與排名資料仍以後端正規化後的 CWA / MOENV 資料為準。

## 專案結構

```text
api/          FastAPI endpoints
crawler/      CWA / MOENV clients, normalization, persistence service
database/     SQLite connection, schema, init code
data/         local runtime data, ignored by git
docs/         planning and deployment notes
frontend/     React / Vite dashboard
scripts/      CLI entry points and validation scripts
```

## API Key 與環境變數

本專案需要 CWA、MOENV 與 Windy API key。CWA 與 MOENV key 只應放在後端環境變數；Windy Map Forecast API 由前端瀏覽器載入，因此需要設定 `VITE_WINDY_API_KEY`，並在 Windy 後台設定授權網域。

複製環境變數範例檔：

```powershell
copy .env.example .env
```

目前 `.env.example` 結構如下：

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

本機開發時，`VITE_API_BASE_URL` 可依照前端代理設定留空。若前端與後端分開部署，請將它設定為後端服務網址：

```env
VITE_API_BASE_URL=https://cwa-weather-crawler.onrender.com
```

## Quick Start

建立 Python 虛擬環境並安裝後端套件：

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

初始化資料庫並寫入第一批觀測資料：

```powershell
py scripts/init_db.py
py scripts/run_weather_observations.py
py scripts/run_pm25.py
```

啟動 FastAPI 後端：

```powershell
uvicorn api.main:app --reload
```

另開一個終端機啟動前端：

```powershell
cd frontend
npm install
npm run dev
```

常用 API 檢查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/summary/counties
Invoke-RestMethod http://127.0.0.1:8000/api/weather/stations.geojson
Invoke-RestMethod http://127.0.0.1:8000/api/pm25/latest
```

## API Endpoints

| Endpoint | Method | 說明 |
| --- | --- | --- |
| `/api/health` | GET | 服務狀態與最新同步資訊 |
| `/api/weather/stations.geojson` | GET | CWA 測站觀測資料 GeoJSON |
| `/api/pm25/latest` | GET | 最新 PM2.5 觀測資料 |
| `/api/summary/counties` | GET | 縣市層級摘要資料 |
| `/api/refresh/weather` | POST | 手動更新 CWA 氣象觀測資料 |
| `/api/refresh/pm25` | POST | 手動更新 MOENV PM2.5 資料 |

`refresh` endpoints 適合 MVP demo 或排程任務使用。若進入正式公開服務，建議增加 token 驗證，避免任何人都能觸發資料更新。

## 部署方式

目前 MVP 採用前後端分離部署：

| 層級 | 平台 | 重點設定 |
| --- | --- | --- |
| 前端 | Vercel | `VITE_API_BASE_URL`, `VITE_WINDY_API_KEY` |
| 後端 | Render | CWA / MOENV API key, SQLite persistent path |
| 資料庫 | Render Persistent Disk | `weather.db` 與 raw snapshot |
| 排程 | GitHub Actions 或 cron service | 定期呼叫 refresh endpoints |

完整雲端部署流程請參考 [docs/cloud_deployment.md](docs/cloud_deployment.md)。

## 未來發展

- 擴充 UV 指標、AQI、PM10、O3、NO2、SO2、CO 等環境資料。
- 建立高溫、強風、強降雨、高 UV 與空品不良的警示規則。
- 累積歷史資料後，加入縣市趨勢、日週月比較與異常觀測提示。
- 增加管理者用的資料更新介面與受保護的 refresh endpoints。
- 強化各縣市、各測站與不同時間區間的視覺化比較能力。

## 開發收穫

- 地圖視覺化與資料真相來源需要分離；Windy 適合做風場背景，但統計與測站數值應以後端資料為準。
- 政府開放資料常見缺值與 sentinel value，例如 `-99`、`-999`，需要在後端先完成清理。
- 環境觀測資料應明確區分 `observed_at` 與 `fetched_at`，避免使用者誤解資料新鮮度。
- OSM 與 Windy 模式應共用相同的指標、篩選條件、門檻與圖例，降低使用者操作成本。
- README、`.env.example` 與部署文件需要和實際功能同步，尤其是前後端分離時的環境變數設定。
