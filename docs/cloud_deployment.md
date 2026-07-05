# 雲端部署引導

本文以目前 repo 的實際架構為準：

- 後端：FastAPI、SQLite、CWA/MOENV crawler。
- 前端：React/Vite、MapLibre、OpenStreetMap 底圖。
- 資料：CWA 即時觀測、MOENV 空氣污染物觀測、縣市摘要統計。
- Windy：作為可切換的風場視覺背景；若部署環境要啟用此模式，前端需要設定 `VITE_WINDY_API_KEY`。

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
py scripts/run_air_quality_observations.py
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
- `/api/air-quality/latest` 有 observations。
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

6. Start Command 建議 MVP 先用「啟動時自動初始化 + 灌第一批資料」：

```bash
python scripts/init_db.py && python scripts/run_weather_observations.py && python scripts/run_air_quality_observations.py && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

這樣就不需要 Render Shell。缺點是每次服務重啟時都會先跑一次 crawler，啟動會比較慢，但對 MVP demo 來說最直覺。等功能穩定後，可以再把 Start Command 改回只初始化資料庫並啟動 API：

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

9. Render 免費帳戶若沒有 Shell 權限，不要卡在手動灌資料。改用以下任一方式初始化資料：

### 方式 A：用 Start Command 自動灌第一批資料

如果第 6 步已經使用完整 Start Command，部署完成後資料會在服務啟動前自動寫入 SQLite。部署完成後直接檢查 API：

```bash
curl https://your-backend.onrender.com/api/health
curl https://your-backend.onrender.com/api/summary/counties
```

### 方式 B：服務啟動後，從本機呼叫 refresh endpoint

如果 Start Command 只啟動 API，等 Render 部署完成後，在自己電腦終端機執行：

```bash
curl -X POST https://your-backend.onrender.com/api/refresh/weather
curl -X POST https://your-backend.onrender.com/api/refresh/air-quality
curl https://your-backend.onrender.com/api/summary/counties
```

Windows PowerShell 如果沒有 `curl`，可改用：

```powershell
Invoke-RestMethod -Method Post https://your-backend.onrender.com/api/refresh/weather
Invoke-RestMethod -Method Post https://your-backend.onrender.com/api/refresh/air-quality
Invoke-RestMethod https://your-backend.onrender.com/api/summary/counties
```

### 方式 C：用 GitHub Actions 手動觸發初始化

如果不想每次部署都跑 crawler，可以新增 workflow，用 `workflow_dispatch` 手動觸發一次：

```yaml
name: Refresh Weather Data

on:
  workflow_dispatch:
  schedule:
    - cron: "*/30 * * * *"

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Wake backend
        run: curl -f "${{ secrets.API_BASE_URL }}/api/health"

      - name: Refresh weather observations
        run: curl -f -X POST "${{ secrets.API_BASE_URL }}/api/refresh/weather"

      - name: Refresh air quality observations
        run: curl -f -X POST "${{ secrets.API_BASE_URL }}/api/refresh/air-quality"
```

GitHub Actions Secrets 需要設定：

```env
API_BASE_URL=https://your-backend.onrender.com
```

10. 檢查：

```bash
curl https://your-backend.onrender.com/api/health
curl https://your-backend.onrender.com/api/summary/counties
```

如果 `/api/summary/counties` 是空的，代表 crawler 還沒成功寫入資料。先檢查 Render Logs 是否有 API key 錯誤、資料庫路徑錯誤、persistent disk mount path 錯誤。

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
POST /api/refresh/air-quality
```

MVP 可以先用 GitHub Actions 或外部 cron 定期呼叫：

```bash
curl -X POST https://your-backend.onrender.com/api/refresh/weather
curl -X POST https://your-backend.onrender.com/api/refresh/air-quality
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

### Render 免費帳戶沒有 Shell

不用 Shell 也可以部署。MVP 最簡單做法是把第一批資料初始化寫進 Start Command，或等服務啟動後從本機呼叫 refresh endpoint。若要長期維護，建議用 GitHub Actions schedule 定期呼叫 refresh endpoint。

### Render 免費方案第一次載入很慢

免費服務可能會 sleep。正式 demo 或對外測試建議升級服務，或改用不休眠的平台。

### CORS 錯誤

目前 FastAPI CORS 是 `allow_origins=["*"]`，方便 MVP 測試。正式公開前建議改成只允許前端正式網域。

## 上線檢查表

- 後端 `/api/health` 正常。
- 後端 `/api/summary/counties` 至少有 22 個縣市摘要。
- 前端 `VITE_API_BASE_URL` 指向後端正式網址。
- OSM 地圖可載入；若啟用 Windy 模式，Windy key 與網域授權需可正常載入。
- 重新整理頁面後統計、排行、圖例仍正常。
- SQLite 路徑在 persistent disk。
- 第一批資料初始化流程不依賴 Render Shell。
- 排程更新策略已確認。
- 公開前已規劃 refresh endpoint 權限控管。
