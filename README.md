# CWA Weather Crawler

台灣即時氣象與 PM2.5 dashboard 專案。目標是以中央氣象署 CWA 觀測資料、環境部 MOENV PM2.5 資料與 Windy 氣象視覺化層，建立一個小而穩定的近即時 dashboard。

目前 repo 已有 FastAPI、SQLite、CWA crawler、normalize layer、repository layer、React/Vite、MapLibre 前端。新的 MVP 方向請以 [docs/development_plan.md](docs/development_plan.md) 為準；forecast-oriented 實作會在後續階段逐步調整。

## 專案結構

```text
api/          FastAPI endpoints
crawler/      CWA/MOENV clients, normalization, persistence service
database/     SQLite connection, schema, init code
data/         local runtime data, ignored by git
docs/         planning and research docs
frontend/     React/Vite dashboard
scripts/      CLI entry points and validation scripts
```

`database/` 是程式碼目錄，不放 runtime SQLite 檔案。`weather.db`、raw API snapshots、local backup DB 都放在 `data/`。

## MVP 方向

- CWA：優先評估 `O-A0003-001`「氣象觀測站-10分鐘綜觀氣象資料」作為即時氣象主 API。
- CWA fallback：若 `O-A0003-001` 覆蓋或缺值不佳，改評估 `O-A0001-001`「全測站逐時氣象資料」。
- MOENV：PM2.5 由環境部 API 提供，優先評估 `aqx_p_432` 或 `aqx_p_02`。
- Windy：只作氣象視覺化層，不作縣市統計或測站數值的真相來源。
- SQLite：MVP 先累積 PM2.5 時間序列；氣象觀測以即時查詢、短期快取、raw snapshot 為主。

## API Key 申請

### CWA API key

1. 前往中央氣象署開放資料平台。
2. 註冊/登入會員。
3. 申請「氣象開放資料平台會員授權碼」。
4. 將授權碼放入 `.env` 的 `CWA_API_KEY`。

CWA key 必須只留在後端，不要放入前端程式碼。

### MOENV API key

1. 前往環境部環境資料開放平台。
2. 同意 API 介接服務條款並申請會員 API key。
3. 將授權碼放入 `.env` 的 `MOENV_API_KEY`。

MOENV key 也必須只留在後端，前端不得直接呼叫環境部 API。

### Windy API key

1. 前往 Windy API 申請 Map Forecast API key。
2. 開發期可使用 Testing key，但 Testing 版不可用於 production。
3. 正式部署需使用符合授權條件的 plan，並在 Windy 後台設定授權 domain。
4. 若使用 Vite 前端載入 Windy，key 會進入 browser bundle，必須靠 Windy domain authorization 控制風險。

## 環境變數

複製範例檔：

```powershell
copy .env.example .env
```

建議設定：

```env
CWA_API_KEY=your_cwa_api_key_here
CWA_DATASET_ID=F-D0047-091
CWA_OBSERVATION_DATASET_ID=O-A0003-001
MOENV_API_KEY=your_moenv_api_key_here
MOENV_PM25_DATASET_ID=aqx_p_432
DATABASE_PATH=data/weather.db
RAW_DATA_DIR=data/raw
VITE_WINDY_API_KEY=your_windy_map_forecast_key_here
```

`CWA_DATASET_ID` 目前保留給舊 forecast crawler；新的即時觀測流程使用 `CWA_OBSERVATION_DATASET_ID`。

## 開發啟動

建立虛擬環境：

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

初始化資料庫：

```powershell
py scripts/init_db.py
```

執行目前 crawler：

```powershell
py scripts/run_crawler.py
```

執行新的 CWA 觀測 crawler：

```powershell
py scripts/run_weather_observations.py
```

執行 PM2.5 crawler：

```powershell
py scripts/run_pm25.py
```

驗證 CWA/MOENV 來源覆蓋率與缺值率：

```powershell
py scripts/validate_sources.py
```

啟動 FastAPI：

```powershell
uvicorn api.main:app --reload
```

啟動前端：

```powershell
cd frontend
npm install
npm run dev
```

氣象地圖模式可在 header 作切換：

- `OSM`：MapLibre dashboard，使用 OpenStreetMap 底圖，讀取 CWA 即時觀測、MOENV PM2.5 與縣市摘要。
- `Windy`：Windy proof page，疊加 CWA weather markers 與 PM2.5 markers。

## Troubleshooting

### Windy 顯示 `windyInit` 無法使用

目前前端會先載入 `https://api.windy.com/assets/map-forecast/libBoot.js`，再等待 `window.windyInit` 掛上全域物件。如果仍出錯，請依序檢查：

1. `.env` 是否有 `VITE_WINDY_API_KEY`，且重啟過 Vite dev server。
2. Windy 後台是否授權目前開發網域，例如 `127.0.0.1` 或 `localhost`。
3. 瀏覽器 devtools network 是否封鎖 `api.windy.com` 或 `www.windy.com`。
4. 廣告阻擋器、隱私外掛、校園/公司網路是否阻擋第三方 script。

