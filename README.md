# CWA GeoMap Monitor

台灣即時氣象、雨量、空氣品質與地震觀測地圖。專案整合中央氣象署 CWA、環境部 MOENV 與地圖服務，將具有經緯度的開放資料轉成可互動查詢的前端視覺化儀表板。

## 專案定位

本專案專注於「可被地圖化的即時觀測資料」。資料若沒有穩定經緯度欄位，原則上不納入目前開發範圍。

目前不納入範圍：

- 沒有經緯度的資料集。
- 鄉鎮天氣預報等未使用 API。
- 警特報或警示通知功能。
- 純文字查詢卡片，例如日出日落資料。
- 需要縣市 polygon highlight 才能合理呈現的資料。

## 目前功能

- CWA 即時氣象觀測：氣溫、濕度、風速、能見度、天氣現象。
- CWA 自動氣象站補充資料。
- CWA 雨量站資料：10 分鐘降雨量、過去 24 小時雨量。
- MOENV 空氣品質監測：PM2.5、PM10、O3 8hr、CO 8hr、SO2、NO2。
- CWA 地震資料：近七天地震震央、規模、深度、最大震度與震度測站。
- OSM 底圖與 Windy 底圖切換。
- API source stack：依資料來源機關分組顯示已接入資料源。
- 同步狀態面板：顯示每個資料來源最近同步結果。

## 功能取捨

### 過去 24 小時累積雨量

保留。累積雨量具有地圖視覺化價值，也能作為後續資料分析與機器學習特徵，例如短時強降雨偵測、區域風險評估與異常雨量偵測。若 CWA API 沒有回傳 24 小時雨量，後端保留 `null`，前端不補成 0。

### 鄉鎮天氣預報

移除。此 API 目前沒有被前端圖層、同步流程或主要統計使用，且會讓 API source stack 與文件誤以為它是 active 圖層資料。

### 日出日落、警特報與警示功能

不開發。這些資料或功能不符合目前「具有經緯度、可地圖化、即時觀測」的主軸。

### 地震圖層與最近事件

保留。地震資料有震央經緯度與震度測站座標，符合本專案的地圖化條件。近七天資料量較小、可讀性較高，也適合作為事件型圖層。

地震圖層目前提供：

- preprocessing 階段只保留近七天地震。
- 前端以最小規模 slider 篩選。
- 可切換「單一事件」與「全部事件」。
- 點擊最近事件 Top 5 可定位震央。
- 地震觀測指標呈現規模、深度、最大震度。

## 前端互動設計

Header 只保留底圖模式：

- `OSM`
- `Windy`

資料內容由下方 LayerControl 控制：

- `氣象 / 雨量 / 空品`
- `地震事件`

氣象、雨量、空品屬於測站型連續觀測資料，因此使用觀測指標與數值門檻篩選。地震屬於事件型資料，因此固定只保留近七天資料，並使用最小規模 slider 與事件顯示模式切換。

## 後端 API

### Refresh

```text
POST /api/refresh/observations
POST /api/refresh/weather
POST /api/refresh/rainfall
POST /api/refresh/air-quality
POST /api/refresh/earthquakes
POST /api/refresh/all
```

`/api/refresh/observations` 會回傳每個來源的同步結果。部分來源失敗時，不會直接讓前端只能看到模糊的 HTTP 500。

### Observation

```text
GET /api/weather/latest
GET /api/weather/stations.geojson
GET /api/pm25/latest
GET /api/air-quality/latest
GET /api/summary/counties
```

### Earthquake

```text
GET /api/earthquakes/latest?limit=100&min_magnitude=3
GET /api/earthquakes/epicenters.geojson?limit=100&min_magnitude=3
```

地震資料在 preprocessing 階段會先過濾，只保留近七天事件。前端再用最小規模 slider 做畫面篩選。

### Source and status

```text
GET /api/data-sources
GET /api/sync/status
GET /api/health
```

`/api/sync/status` 回傳：

- `ok`：所有已接入資料來源最近同步成功。
- `warning`：部分資料來源失敗或尚未同步。
- `error`：核心資料來源都無法同步。

## 主要資料來源

| Provider | Dataset | 用途 |
| --- | --- | --- |
| CWA | `O-A0003-001` | 有人氣象站現在天氣觀測 |
| CWA | `O-A0001-001` | 自動氣象站觀測補充 |
| CWA | `O-A0002-001` | 雨量站 10 分鐘與 24 小時雨量 |
| CWA | `E-A0015-001` | 地震報告 |
| CWA | `E-A0016-001` | 小區域有感地震 |
| MOENV | `aqx_p_432` | 空氣品質監測即時資料 |

## 效能改善方向

目前讀取偏慢的主因可能是初次載入同時觸發同步、資料源較多、前端一次載入多個 endpoint。後續可優先處理：

1. 首頁不自動同步所有資料，改為讀取資料庫最新快取。
2. 手動更新按鈕才觸發 `/api/refresh/observations`。
3. 後端新增 summary cache，避免每次載入都即時計算縣市彙整。
4. 地震、空品、氣象資料分開 lazy loading。
5. 前端只在切換到地震圖層時讀取地震資料。
6. API 加入 response compression 與查詢 limit。
7. 大量歷史資料改用 PostgreSQL/Supabase，並針對 `source_dataset`、`station_id`、`observed_at` 建索引。

## 未來發展

累積歷史資料後，可延伸為降雨異常偵測、空氣品質趨勢預測、區域環境風險評分、地震事件統計分析，以及多資料源特徵工程。這類功能不屬於目前 MVP，但適合放入後續版本。

## 本機開發

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m database.init_db
python -m uvicorn api.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### 常用檢查

```powershell
curl http://127.0.0.1:8000/api/sync/status
curl -X POST http://127.0.0.1:8000/api/refresh/observations
curl http://127.0.0.1:8000/api/earthquakes/latest
```

檢查 CWA 雨量 raw response 是否包含 24 小時欄位：

```powershell
$env:CWA_API_KEY="你的CWA_KEY"
python scripts/check_rainfall_fields.py
```

## 環境變數

```text
CWA_API_KEY=your_cwa_api_key
MOENV_API_KEY=your_moenv_api_key
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WINDY_API_KEY=your_windy_key
```

