# CWA Weather Crawler

台灣即時氣象與 PM2.5 dashboard 專案。目標是以中央氣象署 CWA 觀測資料、環境部 MOENV PM2.5 資料、OpenStreetMap 底圖與 Windy 風場視覺化，建立一個小而穩定的近即時 dashboard。

目前 repo 已有 FastAPI、SQLite、CWA crawler、normalize layer、repository layer、React/Vite、MapLibre 前端。

forecast-oriented 實作會在後續階段逐步調整。

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

## MVP 方向

- CWA：優先評估 `O-A0003-001`「氣象觀測站-10分鐘綜觀氣象資料」作為即時氣象主 API。
- CWA fallback：若 `O-A0003-001` 覆蓋或缺值不佳，改評估 `O-A0001-001`「全測站逐時氣象資料」。
- MOENV：PM2.5 由環境部 API 提供，優先評估 `aqx_p_432` 或 `aqx_p_02`。
- 地圖：正式 dashboard 以 OpenStreetMap/MapLibre 呈現測站資料；Windy 保留為輔助風場視覺化模式，不作統計與測站數值的真相來源。
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
VITE_API_BASE_URL=
VITE_WINDY_API_KEY=your_windy_map_forecast_key_here
```

`CWA_DATASET_ID` 目前保留給舊 forecast crawler；新的即時觀測流程使用 `CWA_OBSERVATION_DATASET_ID`。
`VITE_API_BASE_URL` 本機開發可留空；雲端前端若和 FastAPI 不同網域，請設為後端網址，例如 `https://your-api.onrender.com`。

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

正式 dashboard 目前提供兩個地圖模式：

- `OSM`：MapLibre dashboard，使用 OpenStreetMap 底圖，讀取 CWA 即時觀測、MOENV PM2.5、測站摘要與實測氣溫 top 5 排行。
- `Windy`：Windy 風場視覺化頁，疊加 CWA weather markers 與 MOENV PM2.5 markers；統計與排行榜仍以後端 API 資料為準。

OSM 模式會在地圖下方標示目前資料的觀測時間、CWA/MOENV dataset id 與 OpenStreetMap 底圖來源。

## 未來發展

- 增加全台 UV 值圖層與排行榜，讓使用者能快速比較各測站紫外線強度與高風險區域。
- 擴充更多空汙指標，例如 PM10、O3、NO2、SO2、CO 與 AQI，並保留 PM2.5 作為預設空品指標。
- 建立多指標警示門檻，讓高溫、強風、強降雨、高 UV 與空品不良能以一致的方式呈現在地圖和摘要區。
- 累積較長時間序列後，補上縣市趨勢、日週月比較與異常觀測提示。

## 開發收穫

- 地圖視覺化和資料真相來源要分開：Windy 適合做風場背景，測站數值、排名與統計仍應由 CWA/MOENV API 經後端正規化後提供。
- API 回傳常見缺值與 sentinel value，例如 `-99`、`-999`；後端必須先清理再交給地圖與排名使用，避免錯誤極值影響 UI。
- 觀測時間需要明確呈現，不能只顯示系統同步時間；前端應區分 `observed_at` 和 `fetched_at`。
- Dashboard 的控制列要服務地圖，不應壓縮地圖主視覺；底部控制和可捲動版面比固定滿版更適合資料密度高的測站地圖。
- README、`.env.example`、雲端部署文件要和實際功能同步，尤其是分離部署時的 `VITE_API_BASE_URL` 和 Windy domain authorization。

## 雲端部署

建議 MVP 先採「FastAPI 後端 + Vite 靜態前端」分開部署：

- 後端：Render 或 Railway，需設定 CWA/MOENV API key，並配置可持久化的 SQLite 資料庫路徑。
- 前端：Vercel 或 Netlify，設定 `VITE_API_BASE_URL` 指向後端。

完整步驟見 [docs/cloud_deployment.md](docs/cloud_deployment.md)。

## Troubleshooting

### Windy 顯示 `windyInit` 無法使用

前端會先載入 `https://api.windy.com/assets/map-forecast/libBoot.js`，再等待 `window.windyInit` 掛上全域物件。如果仍出錯，請依序檢查：

1. `.env` 是否有 `VITE_WINDY_API_KEY`，且重啟過 Vite dev server。
2. Windy 後台是否授權目前開發網域，例如 `127.0.0.1` 或 `localhost`。
3. 瀏覽器 devtools network 是否封鎖 `api.windy.com` 或 `www.windy.com`。
4. 廣告阻擋器、隱私外掛、校園/公司網路是否阻擋第三方 script。

### 前端雲端頁面讀不到 `/api`

如果前端與 FastAPI 不同網域，請在前端平台設定：

```env
VITE_API_BASE_URL=https://your-fastapi-service.example.com
```

重新部署前端後，再檢查瀏覽器 network 是否打到正確的後端 `/api/health`。

