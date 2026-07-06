# CWA-GeoMap_Monitor

(Taiwan CWA OpenData API GeoMap Monitor)

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=for-the-badge&logo=react&logoColor=white" alt="React TypeScript" />
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/MapLibre-Renderer-396CB2?style=for-the-badge" alt="MapLibre Renderer" />
</p>

💡 **本專案旨在透過中央氣象署、環境部與地圖服務，建立一個基於台灣地圖的即時環境觀測與視覺化網站。**

專案透過 OpenData API 呼叫取得觀測資料，經由後端清洗、正規化與儲存後，再以前端 GeoMap 介面呈現測站分布、觀測指標、縣市差異與地震事件。

🔗 [**Live Demo**](https://cwa-weather-crawler.vercel.app/)

---

## 🎯 專案核心定位與特色

本專案定位為 **可地圖化 OpenData API 的即時觀測監測介面**。資料若沒有穩定經緯度，或目前沒有被地圖圖層、同步流程與主要統計使用，會從開發範圍中移除。

1. **OpenData API 呼叫應用**：後端透過中央氣象署與環境部開放 API 取得觀測資料，整理為前端可直接使用的統一資料結構。
2. **GeoMap 地圖監測介面**：前端以地圖作為主要互動入口，讓使用者能直接從地理分布理解各地測站狀態。
3. **空汙 / 氣象 / 雨量整合**：支援氣溫、近 10 分鐘降雨、近 24 小時雨量、濕度、風速、能見度、PM2.5 與多項空氣污染物觀測。
4. **地震事件圖層**：接入近七天地震震央、規模、深度、最大震度與震度測站，支援規模篩選與單一事件檢視。
5. **雙地圖視覺化設計**：OSM 底圖提供清楚的測站分布視角；Windy 提供風場背景並疊加同一組觀測指標圓點。
6. **可控的資料範圍**：鄉鎮天氣預報、日出日落、警特報與警示通知不屬於目前 MVP 範圍。

---

## 🏗️ 系統資料流

```text
CWA / MOENV OpenData API
        ↓
data_pipeline client
        ↓
normalize / clean
        ↓
SQLite repository
        ↓
FastAPI routes / services
        ↓
React + MapLibre / Windy frontend
```

目前首頁初次載入會先讀取資料庫快取資料；使用者按下「更新觀測資料」後，才會觸發外部 API 同步。

---

## 📂 目錄結構與模組說明

```text
├── api/                         # FastAPI HTTP layer
│   ├── main.py                   # App bootstrap, CORS and router registration
│   ├── routes/                   # HTTP endpoints grouped by domain
│   └── services/                 # Query, summary, source catalog and GeoJSON services
├── data_pipeline/                # CWA / MOENV API clients, data sync and normalization
│   ├── service.py                # Single-source sync functions
│   ├── sync_manager.py           # Multi-source sync entry point
│   ├── cwa_client.py             # CWA OpenData API client
│   ├── moenv_client.py           # MOENV OpenData API client
│   ├── normalize.py              # Weather / rainfall normalization
│   ├── earthquake.py             # Earthquake normalization
│   └── repository.py             # Raw snapshots, DB write and fetch logs
├── database/                     # SQLite connection, schema, initialization and migrations
├── data/                         # Local runtime data, ignored by git
├── docs/                         # API source review and notes
├── frontend/                     # React / Vite GeoMap monitor frontend
└── scripts/                      # CLI scripts for API sync, init and validation
```

---

## 📊 資料來源與視覺化模式

| 類別 | Dataset / 服務 | 用途 | 目前狀態 |
| --- | --- | --- | --- |
| 中央氣象署 CWA | `O-A0003-001` | 有人氣象站即時觀測、能見度、天氣現象 | Active |
| 中央氣象署 CWA | `O-A0001-001` | 自動氣象站即時觀測補充 | Active |
| 中央氣象署 CWA | `O-A0002-001` | 自動雨量站、近 10 分鐘雨量、近 24 小時雨量 | Active |
| 中央氣象署 CWA | `E-A0015-001` | 地震報告、震央、規模、深度、最大震度 | Active |
| 中央氣象署 CWA | `E-A0016-001` | 小區域有感地震與震度測站 | Active |
| 環境部 MOENV | `aqx_p_432` | 空品狀態、PM2.5、PM10、O3、CO、NO2、SO2 | Active |

完整 API 可用性盤點請看 [`docs/API_SOURCES.md`](docs/API_SOURCES.md)。

---

## 🧹 已移除或不納入範圍

| 項目 | 決策 |
| --- | --- |
| 鄉鎮天氣預報 / `F-D0047-093` | 未被地圖圖層、同步流程與主要統計使用，已從 active scope 移除。 |
| 日出日落 | 無穩定經緯度，不做 marker 圖層。 |
| 警特報 | 不做警示功能，也不做 polygon highlight。 |
| 沒有經緯度的資料 | 不納入目前地圖觀測專案範圍。 |

---

## 🧮 空氣污染物指標

本專案目前不把綜合空品分數作為前端主要觀測指標，而是直接呈現環境部空氣品質監測資料中的污染物觀測值。這樣能讓使用者直接比較 PM2.5、PM10、O3、CO、SO2、NO2 等具體測項。

目前前端使用的空品欄位包含：`status`、`pollutant`、`pm25`、`pm25_avg`、`pm10`、`pm10_avg`、`so2`、`co`、`co_8hr`、`o3`、`o3_8hr`、`no2`、`nox`、`no`。

---

## 👁️ 能見度與累積雨量

能見度由 CWA 觀測資料的 `Visibility` 或 `VisibilityDescription` 正規化為 `visibility_km` 與 `visibility_description`，前端可直接用於地圖點位、排行與縣市摘要。

雨量目前分成 `rainfall_10min` 與 `rainfall_24h`。若近 24 小時雨量沒有由 CWA API 回傳，後端保留 `null`，前端不補成 `0`，避免把「缺值」誤判為「沒有下雨」。

---

## 🌏 地震圖層

地震資料由 `E-A0015-001` 與 `E-A0016-001` 提供。後端 preprocessing 階段只保留近七天地震，前端支援：

- 最小規模 slider 篩選。
- 單一事件 / 全部事件顯示模式。
- 最近事件 Top 5。
- 震央與震度測站 popup。
- OSM 與 Windy 模式共用同一組地震篩選狀態。

---

## ⚡ 資料載入與效能設計

後端資料同步採用清楚分層的 API client、normalization、repository 與 sync manager 流程，讓 CWA 與 MOENV 資料可以在同一套管線中清洗、保存與對外服務。

前端首頁初次載入先讀取資料庫快取，不再自動同步外部 API。使用者按下「更新觀測資料」後，才會呼叫 `/api/refresh/observations` 更新主要觀測資料來源。

後續若資料量增加，可再加入 summary cache、lazy loading、response compression、PostgreSQL / Supabase 與索引優化。

---

## 🔑 環境變數

本專案需要 CWA、MOENV 與 Windy 的環境變數設定。實際變數名稱與範例請參考 `.env.example`，正式部署時請在後端平台與前端平台分別設定。

```text
CWA_API_KEY=your_cwa_api_key
MOENV_API_KEY=your_moenv_api_key
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WINDY_API_KEY=your_windy_key
```

---

## 🚀 部署與本地開發

後端：

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
py -m database.init_db
uvicorn api.main:app --reload
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

常用檢查：

```powershell
curl http://127.0.0.1:8000/api/sync/status
curl -X POST http://127.0.0.1:8000/api/refresh/observations
curl http://127.0.0.1:8000/api/earthquakes/latest
```

---

## 📡 API Endpoints

| Endpoint | Method | 說明 |
| --- | --- | --- |
| `/api/health` | GET | 服務狀態與最新同步資訊 |
| `/api/data-sources` | GET | 專案使用中的 API source catalog |
| `/api/sync/status` | GET | 各資料來源最近同步狀態 |
| `/api/weather/stations.geojson` | GET | CWA 測站觀測資料 GeoJSON |
| `/api/weather/latest` | GET | 最新 CWA 氣象 / 雨量觀測資料 |
| `/api/pm25/latest` | GET | 最新空氣品質觀測資料，保留相容舊命名 |
| `/api/air-quality/latest` | GET | 最新空氣品質觀測資料 |
| `/api/summary/counties` | GET | 縣市層級摘要資料 |
| `/api/earthquakes/latest` | GET | 近七天地震事件資料 |
| `/api/earthquakes/epicenters.geojson` | GET | 近七天地震震央 GeoJSON |
| `/api/refresh/weather` | POST | 更新 CWA 氣象觀測資料 |
| `/api/refresh/rainfall` | POST | 更新 CWA 雨量觀測資料 |
| `/api/refresh/air-quality` | POST | 更新 MOENV 空氣品質資料 |
| `/api/refresh/earthquakes` | POST | 更新 CWA 地震資料 |
| `/api/refresh/observations` | POST | 透過 sync manager 更新主要觀測資料來源 |
| `/api/refresh/all` | POST | 更新全部已接入觀測資料來源 |

Legacy note：舊的 `/api/temperature/geojson` 已移除，現在統一使用 `/api/weather/stations.geojson`。

---

## 🧭 未來發展

- 地震資料切換到地震圖層時再 lazy load，降低首頁初始請求量。
- 建立 summary cache，避免每次載入都即時計算縣市彙整。
- 依資料量與部署平台評估非同步抓取、背景任務佇列或 PostgreSQL，提升多資料源更新效率。
- 累積歷史資料後，加入縣市趨勢、時間序列比較、異常觀測提示與機器學習應用。

---

## 📝 開發收穫

- 地圖視覺化與資料真相來源需要分離；Windy 適合作為風場背景，測站數值、摘要與排名仍應由後端正規化資料提供。
- 空氣品質呈現應優先對齊具體污染物測項，讓使用者能直接比較 PM2.5、PM10、O3、CO、SO2、NO2 等來源值。
- 政府開放資料常見缺值與 sentinel value，例如 `-99`、`-999`，需要在後端清理後再交給前端呈現。
- 環境觀測資料應明確區分 `observed_at` 與 `fetched_at`，避免使用者誤解資料新鮮度。
- OSM 與 Windy 模式應共用相同的指標、篩選條件、門檻與圖例，降低使用者操作成本。
- README、`.env.example` 與部署文件需要和實際功能同步，尤其是前後端分離時的環境變數設定與 API 使用邊界。
