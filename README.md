# CWA-GeoMap_Monitor

(Taiwan CWA OpenData API GeoMap Monitor)

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=for-the-badge&logo=react&logoColor=white" alt="React TypeScript" />
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/MapLibre-GeoMap-396CB2?style=for-the-badge" alt="MapLibre GeoMap" />
</p>

💡 **本專案旨在透過中央氣象署與相關政府開放 API，建立一套以地圖為核心的台灣環境觀測監測與視覺化應用。**

專案重點不是傳統網頁爬蟲，而是透過 OpenData API 呼叫取得觀測資料，經由後端清洗、正規化與儲存後，再以前端 GeoMap 介面呈現測站分布、觀測指標、縣市差異與環境狀態。使用者可透過地圖模式、指標切換、縣市篩選與門檻控制，快速掌握台灣各地的氣象與環境觀測資訊。

🔗 [**Live Demo**](https://cwa-weather-crawler.vercel.app/)

---

## 🎯 專案核心定位與特色

本專案定位為 **CWA OpenData API 的地圖監測與視覺化應用**。CWA 是主要資料核心，環境部資料則作為空氣品質觀測的延伸整合，讓地圖能呈現更完整的區域環境狀態。

1. **OpenData API 呼叫應用**：
   後端透過中央氣象署與環境部開放 API 取得觀測資料，並將不同來源的資料格式整理為前端可直接使用的統一資料結構。

2. **GeoMap 地圖監測介面**：
   前端以地圖作為主要互動入口，讓使用者能直接從地理分布理解各地測站狀態，而不是只透過表格或單純圖表閱讀資料。

3. **雙地圖模式設計**：
   OSM 模式以 OpenStreetMap / MapLibre 呈現測站資料；Windy 模式提供風場背景，並疊加相同觀測指標的測站圓點，讓兩種地圖模式維持一致操作邏輯。

4. **可擴充的觀測資料流程**：
   API client、normalization、repository 與 FastAPI layer 分開設計，後續可逐步加入 UV、AQI、PM10、O3、NO2、SO2、CO 或其他環境觀測資料。

---

## 🏗️ 系統架構與資料流

```mermaid
flowchart TD
    subgraph "資料來源 (OpenData API Sources)"
        A[中央氣象署 CWA OpenData API]
        B[環境部 MOENV OpenData API]
    end

    subgraph "後端資料處理 (FastAPI / Python)"
        C[API Client]
        D[Normalize / Clean]
        E[(SQLite Database)]
        F[FastAPI Endpoints]
    end

    subgraph "前端地圖監測介面 (React / Vite)"
        G[MapLibre / OSM Mode]
        H[Windy Mode]
        I[County Summary / Controls]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
```

---

## 📂 目錄結構與模組說明

```text
├── api/                         # FastAPI endpoints
├── crawler/                     # CWA / MOENV API clients and data normalization
├── database/                    # SQLite connection, schema and initialization
├── data/                        # Local runtime data, ignored by git
├── docs/                        # Planning and cloud deployment notes
├── frontend/                    # React / Vite GeoMap monitor frontend
└── scripts/                     # CLI scripts for API sync, init and validation
```

---

## 📊 資料來源與視覺化模式

| 類別 | Dataset / 服務 | 用途 |
| --- | --- | --- |
| 中央氣象署 CWA | `O-A0003-001` | 氣象觀測資料 |
| 環境部 MOENV | `aqx_p_432` | 空氣品質觀測資料 |
| OpenStreetMap | Map tiles | OSM 模式地圖底圖 |
| Windy | Map Forecast API | Windy 模式風場背景 |

---

## 🔑 API Key 與環境變數

本專案需要 CWA、MOENV 與 Windy API key。

- `CWA_API_KEY` 與 `MOENV_API_KEY` 僅供後端使用。
- `VITE_WINDY_API_KEY` 供前端載入 Windy Map Forecast API。
- 若前後端分離部署，`VITE_API_BASE_URL` 需設定為後端服務網址。

複製環境變數範例檔：

```powershell
copy .env.example .env
```

`.env.example`：

```env
# Frontend
VITE_API_BASE_URL=your_backend_website_deployment_link
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

---

## 🚀 部署與本地開發

### 1. 安裝後端環境

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 初始化資料庫與同步觀測資料

```powershell
py scripts/init_db.py
py scripts/run_weather_observations.py
py scripts/run_pm25.py
```

### 3. 啟動 FastAPI 後端

```powershell
uvicorn api.main:app --reload
```

### 4. 啟動前端地圖介面

```powershell
cd frontend
npm install
npm run dev
```

啟動後可於瀏覽器開啟 Vite 顯示的 localhost 網址進行預覽。

---

## 📡 API Endpoints

| Endpoint | Method | 說明 |
| --- | --- | --- |
| `/api/health` | GET | 服務狀態與最新同步資訊 |
| `/api/weather/stations.geojson` | GET | CWA 測站觀測資料 GeoJSON |
| `/api/pm25/latest` | GET | 最新空氣品質觀測資料 |
| `/api/summary/counties` | GET | 縣市層級摘要資料 |
| `/api/refresh/weather` | POST | 更新 CWA 氣象觀測資料 |
| `/api/refresh/pm25` | POST | 更新 MOENV 空氣品質資料 |

---

## ☁️ 雲端部署

目前 MVP 採用前後端分離部署：

| 層級 | 平台 | 重點設定 |
| --- | --- | --- |
| 前端 | Vercel | `VITE_API_BASE_URL`, `VITE_WINDY_API_KEY` |
| 後端 | Render | CWA / MOENV API key, SQLite persistent path |
| 資料庫 | Render Persistent Disk | `weather.db` 與 raw snapshot |
| 排程 | GitHub Actions 或 cron service | 定期呼叫 refresh endpoints |

完整部署流程請參考 [docs/cloud_deployment.md](docs/cloud_deployment.md)。

---

## 🧭 未來發展

- 擴充 UV、AQI、PM10、O3、NO2、SO2、CO 等環境觀測指標。
- 建立高溫、強風、強降雨、高 UV 與空氣品質不良等警示條件。
- 累積歷史資料後，加入縣市趨勢、時間序列比較與異常觀測提示。
- 增加後台管理介面，讓資料更新與排程狀態更容易被維護。
- 強化不同縣市、測站與時間區間之間的 GeoMap 視覺化比較。

---

## 📝 開發收穫

- 專案命名應避免誤導；本專案主要是 OpenData API 呼叫、資料整理與地圖視覺化，而不是傳統 crawler。
- 地圖視覺化與資料真相來源需要分離；Windy 適合作為風場背景，測站數值、摘要與排名仍應由後端正規化資料提供。
- 政府開放資料常見缺值與 sentinel value，例如 `-99`、`-999`，需要在後端清理後再交給前端呈現。
- 環境觀測資料應明確區分 `observed_at` 與 `fetched_at`，避免使用者誤解資料新鮮度。
- OSM 與 Windy 模式應共用相同的指標、篩選條件、門檻與圖例，降低使用者操作成本。
- README、`.env.example` 與部署文件需要和實際功能同步，尤其是前後端分離時的環境變數設定與 API key 使用邊界。
