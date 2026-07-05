# 雲端部署引導

本文以目前 repo 的實際架構為準：

- 後端：FastAPI、SQLite、CWA/MOENV crawler。
- 前端：React/Vite、MapLibre、OpenStreetMap 底圖。
- 資料：CWA 即時觀測、MOENV PM2.5、縣市摘要統計。
- 已移除：Windy 頁面與第三方天氣疊圖，不需要 `VITE_WINDY_API_KEY`。

## 建議架構

MVP 建議先分開部署：

| 層 | 建議平台 | 說明 |
| --- | --- | --- |
| FastAPI 後端 | Render Web Service 或 Railway Service | 保留 CWA/MOENV key、提供 `/api/*` |
| SQLite data | Render Persistent Disk 或 Railway Volume | 存 `weather.db` 與 raw snapshots |
| Vite 前端 | Vercel 或 Netlify | 靜態網站，透過 `VITE_API_BASE_URL` 呼叫後端 |
| 排程更新 | GitHub Actions、Render Cron、cron-job.org | 定期呼叫 refresh endpoint 或執行 crawler |

先不要把 API key 放進前端平台。CWA/MOENV key 只放後端。

## 部署前檢查

在本機先確認：

```powershell
py scripts/init_db.py
py scripts/run_weather_observations.py
py scripts/run_pm25.py
uvicorn api.main:app --reload
```

另一個終端機：

```powershell
cd frontend
npm install
npm run build
```

瀏覽器確認：

- `/api/health` 有回應。
- `/api/weather/stations.geojson` 有 feature。
- `/api/pm25/latest` 有 observations。
- `/api/summary/counties` 有 summaries。
- 前端沒有 `windyInit`、`Zoom Level not supported` 或 `/api` 404。

## 後端部署：Render

1. 在 Render 建立 `New Web Service`。
2. 連到 GitHub repo。
3. Root Directory 留空，使用 repo 根目錄。
4. Runtime 選 Python。
5. Build Command：

```bash
pip install -r requirements.txt
```

6. Start Command：

```bash
python scripts/init_db.py && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

7. 建立 Persistent Disk：

| 設定 | 建議值 |
| --- | --- |
| Mount Path | `/var/data` |
| Size | MVP 可先 1 GB |

8. 設定後端環境變數：

```env
CWA_API_KEY=your_cwa_api_key_here
CWA_DATASET_ID=F-D0047-091
CWA_OBSERVATION_DATASET_ID=O-A0003-001
MOENV_API_KEY=your_moenv_api_key_here
MOENV_PM25_DATASET_ID=aqx_p_432
DATABASE_PATH=/var/data/weather.db
RAW_DATA_DIR=/var/data/raw
```

9. 部署後先開 Render Shell，手動灌第一批資料：

```bash
python scripts/run_weather_observations.py
python scripts/run_pm25.py
```

10. 檢查：

```bash
curl https://your-backend.onrender.com/api/health
curl https://your-backend.onrender.com/api/summary/counties
```

## 前端部署：Vercel

1. 在 Vercel 建立新專案並連到同一個 repo。
2. Root Directory 設為 `frontend`。
3. Framework Preset 選 Vite。
4. Build Command：

```bash
npm run build
```

5. Output Directory：

```text
dist
```

6. 設定前端環境變數：

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

7. 重新部署前端。

部署後檢查瀏覽器 Network：

- `/api/health` 應該打到 Render 後端。
- `/api/summary/counties` 應該回傳縣市摘要。
- 地圖上應該只看到 OSM 底圖與觀測點。

## 排程更新資料

目前 repo 已有 refresh endpoints：

```text
POST /api/refresh/weather
POST /api/refresh/pm25
```

MVP 可以先用 GitHub Actions 或外部 cron 定期呼叫：

```bash
curl -X POST https://your-backend.onrender.com/api/refresh/weather
curl -X POST https://your-backend.onrender.com/api/refresh/pm25
```

正式公開前應補 refresh endpoint 權限控管，避免任何人都能觸發 crawler。比較穩的做法是：

- 後端新增 `REFRESH_TOKEN` 檢查。
- 排程服務用 secret 帶 header 呼叫。
- 前端的「更新觀測資料」改成管理者限定，或改為只顯示最後更新時間。

## 常見問題

### 前端顯示 API 連線異常

先確認 Vercel 的 `VITE_API_BASE_URL` 是否有設定完整後端網址，且重新部署過前端。

### 後端重啟後資料消失

代表 SQLite 放在 ephemeral filesystem。確認雲端平台有 persistent disk/volume，並把：

```env
DATABASE_PATH=/var/data/weather.db
RAW_DATA_DIR=/var/data/raw
```

指到持久化目錄。

### Render 免費方案第一次載入很慢

免費服務可能會 sleep。正式 demo 或對外測試建議升級服務，或改用不休眠的平台。

### CORS 錯誤

目前 FastAPI CORS 是 `allow_origins=["*"]`，方便 MVP 測試。正式公開前建議改成只允許前端正式網域。

## 上線檢查表

- 後端 `/api/health` 正常。
- 後端 `/api/summary/counties` 至少有 22 個縣市摘要。
- 前端 `VITE_API_BASE_URL` 指向後端正式網址。
- OSM 地圖可載入，沒有 Windy 或 RainViewer 錯誤。
- 重新整理頁面後統計、排行、圖例仍正常。
- SQLite 路徑在 persistent disk。
- 排程更新策略已確認。
- 公開前已規劃 refresh endpoint 權限控管。
