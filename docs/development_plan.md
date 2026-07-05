# CWA Weather Crawler 開發計畫書

更新日期：2026-07-04

## 1. 目前專案診斷

目前 repo 已具備可延伸的基本架構：

- `api/main.py`：FastAPI 後端。
- `database/`：SQLite connection、schema、init script。
- `crawler/`：CWA client、normalize layer、repository layer、crawler service。
- `frontend/`：React/Vite + MapLibre GL JS 前端。
- `.env`：CWA API key 留在後端，沒有直接外流到前端。
- `data/`：local runtime SQLite、raw snapshots 與 backup；此目錄應被 git ignore。

但目前實作方向仍偏向「預報資料平台」，和新的「即時性台灣氣象 + PM2.5 dashboard」目標不一致。

主要問題：

- DB schema 以 `forecasts` 為核心，容易把 forecast、observation、air quality 混在一起。
- crawler 目前綁定單一 `CWA_DATASET_ID` 與 `normalize_f_d0047_091`，不利於改成多資料源。
- FastAPI endpoint 以 `/api/forecast/*` 和 `/api/temperature/geojson` 為主，資料模型過窄。
- 前端 TypeScript type 仍是 `ForecastProperties`，但畫面文字已混用觀測資料概念。
- RainViewer 雷達/衛星疊圖曾集中在 `MapLibreMap.tsx`，因 tile zoom 限制與體驗不穩，已決策自主 dashboard 移除。
- 現有 `.env` 有載入 CWA key，但 live probe 對 CWA API 回傳 HTTP 401，因此站數、縣市覆蓋率、欄位缺值率還不能視為已驗證。

## 2. MVP 目標

MVP 定位為「以即時或近即時資料為主的台灣氣象與 PM2.5 dashboard」，資料功能保持小而穩定。

MVP 包含：

- 一支 CWA 即時/近即時觀測 API。
- 一支 MOENV PM2.5 API。
- CWA 與 MOENV key 只由後端控管。
- OSM/MapLibre 作為正式 dashboard 地圖；Windy 與第三方天氣疊圖暫緩，不進 MVP 主介面。
- 各縣市目前氣溫、降水、風速、風向、相對濕度、PM2.5 狀態。
- 測站 marker、popup、縣市統計表、排行、資料更新時間。
- PM2.5 從 MVP 起就定期寫入 SQLite，累積自己的時間序列。

MVP 不包含：

- 未來天氣預報。
- 長期氣候歷史分析。
- 完整 AQI dashboard。
- PM10、O3、NO2、SO2、CO 等多污染物前端分析。
- 機器學習、AI 預測、年度/季節/極端氣候統計。

## 3. API Research 狀態

已查詢來源：

- CWA 官方 OpenAPI：`https://opendata.cwa.gov.tw/apidoc/v1`
- CWA 測站清單參考：`https://hdps.cwa.gov.tw/static/state.html`
- MOENV 官方 OpenAPI：`https://data.moenv.gov.tw/swagger/openapi.yaml`
- Windy Map Forecast API docs / pricing；因前端 key/domain 與第三方 script 風險，MVP 已決策移除。

實測狀態：

- 2026-07-03 使用有效 key 驗證 `O-A0003-001` 成功：363 筆、22 縣市，station id/name、county、town、lat/lon、observed_at 皆無缺值。
- `O-A0003-001` 核心氣象欄位缺值率約 4.7% 到 5.5%，可接受；`UVIndex` 缺值率約 91.7%，不適合放入 MVP 核心。
- 2026-07-03 使用有效 key 驗證 MOENV `aqx_p_432` 成功：84 筆、22 縣市，station id/name、county、lat/lon、observed_at、PM2.5、PM2.5_AVG 皆無缺值。
- 因此 MVP 主資料源確定採用 CWA `O-A0003-001` 與 MOENV `aqx_p_432`；UV 移到第二階段或只作 optional popup 欄位。

## 4. 資料來源調查表

| API 名稱 | 資料集代碼 | 資料類型 | 更新頻率 | 站台/筆數 | 縣市欄位 | 經緯度 | 氣溫 | 高低溫 | 降水 | 風速 | 風向 | 濕度 | UV | 雷達/衛星/雲圖 | 歷史資料 | 完整度 | MVP 適合度 | 建議 |
|---|---|---:|---|---:|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|
| 氣象觀測站 10 分鐘綜觀氣象資料 | `O-A0003-001` | 觀測 | 官方名稱為 10 分鐘資料 | 363 筆，22 縣市 | 有，`GeoInfo=CountyName,TownName` | 有，`GeoInfo=Coordinates` | 有，缺值約 5% | 有，`DailyHigh`, `DailyLow` | 有，目前以 `Now` 解析為 rainfall，需在 UI wording 保守標示 | 有，缺值約 5% | 有，缺值約 5% | 有，缺值約 5% | 有但缺值約 91.7% | 無 | 非長期歷史來源 | 9/10 | 9/10 | 確定作為 MVP 主氣象 API；UV 不列核心。 |
| 氣象觀測站全測站逐時氣象資料 | `O-A0001-001` | 觀測 | 官方名稱為逐時資料 | 待有效 key | 有，`GeoInfo=CountyName,TownName` | 有，`GeoInfo=Coordinates` | 有，`AirTemperature` | 有，`DailyHigh`, `DailyLow` | 可能由 `Now` 表示，需確認 | 有 | 有 | 有 | 官方 enum 未列 `UVIndex` | 無 | 非長期歷史來源 | 8/10 | 8/10 | 若 `O-A0003-001` 覆蓋不足或缺值過高，改用此 API。 |
| 鄉鎮天氣預報全臺灣各鄉鎮市區預報資料 | `F-D0047-093` | 預報 | 預報更新 | 非 MVP 重點 | 有預報地點 | 非測站觀測模型 | 依 element | 依 element | 依 element | 依 element | 依 element | 依 element | 非主資料 | 無 | 預報期間 | 5/10 | 3/10 | MVP 不使用，除非產品回到預報方向。 |
| 鄉鎮天氣預報臺灣未來 1 週 | `F-D0047-091` | 預報 | 1 週預報 | 目前程式使用 | 有 | 現有 normalizer 嘗試解析 | 有 | 有 | PoP，不是實測降雨 | 有 | 有 | 有 | 非主資料 | 無 | 預報期間 | 5/10 | 2/10 | 現有來源，但不作為新 MVP 核心。 |
| 空氣品質指標 AQI | `aqx_p_432` | 空品即時狀態 | 待環境部實際更新節奏確認 | 84 筆，22 縣市 | 有 | 有 | 非氣象主資料 | 無 | 無 | 不作為氣象來源 | 不作為氣象來源 | 無 | 無 | 無 | 即時空品 | 9/10 | 9/10 | 確定作為 MVP PM2.5 來源；只使用 PM2.5 與 PM2.5_AVG。 |
| 細懸浮微粒資料 PM2.5 | `aqx_p_02` | PM2.5 | 待有效 key 確認 | 待有效 key | 待驗證 | 待驗證 | 無 | 無 | 無 | 無 | 無 | 無 | 無 | 無 | 未確認 | 7/10 | 7/10 | 若比 `aqx_p_432` 更乾淨且 metadata 足夠，可作 PM2.5 主來源。 |
| 鹿林山紫外線即時監測資料 | `uv_s_01` | UV | 即時資料集名稱 | 可能很有限 | 不適合全台 | 待驗證 | 無 | 無 | 無 | 無 | 無 | 無 | 有，但疑似單站/特定站 | 無 | 即時 UV | 4/10 | 2/10 | 不作 MVP 全台 UV 主來源。 |
| 紫外線測站位置圖 | `gisepa_p_26` | UV metadata | 靜態/位置資料 | 待驗證 | 待驗證 | 可能有 | 無 | 無 | 無 | 無 | 無 | 無 | 只有測站位置 | 無 | metadata | 4/10 | 2/10 | 只能輔助，不能提供 UV 即時值。 |
| Windy Map Forecast API | 視覺 API | 地圖/forecast overlay | 依模型與方案 | 非測站資料 | 不是統計來源 | 地圖座標 | overlay | overlay | overlay | overlay | overlay | overlay | 需依方案/overlay 支援確認 | 有 satellite/cloud 等視覺層 | forecast 視覺 | 7/10 | 暫緩 | 已從 MVP 介面移除；後續若要恢復，需先解決 key/domain、production plan 與 lifecycle 風險。 |

## 5. CWA API 選擇

主選：`O-A0003-001`。2026-07-03 live validation 已通過，MVP 採用此資料集。

理由：

- 官方 summary 是「氣象觀測站-10分鐘綜觀氣象資料」。
- 官方 `WeatherElement` enum 包含 MVP 所需的 `AirTemperature`、`WindDirection`、`WindSpeed`、`RelativeHumidity`、`DailyHigh`、`DailyLow`、`UVIndex`。
- 官方 `GeoInfo` enum 包含 `Coordinates`、`StationAltitude`、`CountyName`、`TownName`、`CountyCode`、`TownCode`。
- 比 forecast dataset 更符合即時 dashboard 定位。

備選：`O-A0001-001`。

切換條件：

- `O-A0003-001` live 驗證後縣市覆蓋不足。
- 核心欄位缺值率過高。
- `Now` 或降水欄位語意不適合 dashboard。
- API 穩定性不如逐時觀測資料。

驗證 gate：

- 取得總筆數、唯一測站數、唯一縣市數。
- 目標至少覆蓋台灣 22 縣市。
- 檢查 station id、station name、county、town、lat/lon、observation time、update time。
- 計算氣溫、降水、風速、風向、濕度、UV 的缺值率。
- 確認 `Now` 欄位到底是目前天氣、現在天氣代碼、降水或其他結構，避免 UI 誤標。

## 6. PM2.5 API 選擇

主選：MOENV `aqx_p_432`。2026-07-03 live validation 已通過，MVP 採用此資料集。

理由：

- PM2.5 與空品資料主責來源是環境部，不是 CWA。
- 官方 OpenAPI 確認 `aqx_p_432` 是「空氣品質指標(AQI)」。
- 若 live records 同時包含 PM2.5、PM2.5_AVG、站名、站號、縣市、經緯度、發布時間，最適合 MVP。

備選：MOENV `aqx_p_02`。

理由：

- 官方 OpenAPI 確認 `aqx_p_02` 是「細懸浮微粒資料(PM2.5)」。
- 若它提供更乾淨的 PM2.5-only 結構且 metadata 足夠，可優先採用。

MVP 規則：

- 前端核心只呈現 PM2.5 與 PM2.5_AVG。
- AQI、PM10、O3、NO2、SO2、CO 若原始 API 一併回傳，可被動存 raw snapshot，但不做 MVP 前端功能。
- PM2.5 必須從 MVP 起定期寫入 SQLite。

## 7. UV 可行性

目前最有希望的是 CWA `O-A0003-001` 的 `UVIndex`，但 2026-07-03 live validation 顯示缺值率約 91.7%。

決策：

- MVP 不把 UV 放入核心卡片或排行。
- 可在 station popup 中保留 optional 欄位；若沒有值就隱藏。
- 不可以用紅外線雲圖、cloud layer、satellite layer 假裝 UV。

概念界線：

- UV：紫外線指數或紫外線觀測/預報值。
- Cloud：雲量、雲層或雲高等視覺化，不是 UV。
- Infrared：紅外線衛星影像，常用於雲頂/雲系觀察，不是 UV。
- Satellite：衛星影像視覺層，不是測站 UV 量測。

## 8. 地圖與天氣疊圖策略

正式 dashboard 目前固定使用 MapLibre + OpenStreetMap。Windy 與 RainViewer 類第三方天氣疊圖已從 MVP 主介面移除。

後端統計真相來源：

- CWA：氣象測站值與縣市氣象統計。
- MOENV：PM2.5 測站值、縣市 PM2.5 統計、PM2.5 儲存。

移除原因：

- RainViewer overlay 在目前 zoom/tile 條件下容易出現 `Zoom Level Not Supported`，視覺價值不足。
- Windy 需要前端載入第三方 script，且 production key/domain 授權、Testing key 限制、單一 instance lifecycle 都會增加部署風險。
- MVP 的核心價值是 CWA/MOENV 測站觀測、縣市統計與排行，不是第三方 forecast overlay。

後續若要恢復天氣視覺層，必須先滿足：

- 使用可上 production 的授權方案。
- domain authorization 已驗證。
- 不把 CWA/MOENV 後端 key 暴露到 browser。
- 有明確 fallback，不影響 OSM 主 dashboard。

## 9. API Key 與安全策略

CWA：

- `CWA_API_KEY` 只放後端。
- 前端不得直接打 CWA API。

MOENV：

- 新增 `MOENV_API_KEY`，只放後端。
- 前端不得直接打 MOENV API。

前端：

- 雲端部署時使用 `VITE_API_BASE_URL` 指向 FastAPI 後端。
- 不在前端保存 CWA/MOENV API key。
- Windy key 已從 MVP env 移除。

## 10. 資料儲存策略

專案結構決策：

- `database/` 只放 database 相關程式碼，例如 connection、schema、migration/init script。
- runtime SQLite 檔案不放在 `database/`，避免 Python package 與本機資料混在一起。
- 本機資料統一放在 `data/`：`data/weather.db`、`data/raw/`、`data/weather.db.bak`。
- `data/` 應加入 `.gitignore`，避免把 runtime DB 或 API snapshots commit 進 repo。

氣象觀測：

- MVP 先以即時查詢 + 短期快取為主。
- 保留 raw snapshot 與 fetch log 以便除錯。
- 不在 MVP 建完整長期氣象歷史資料庫。

PM2.5：

- 從 MVP 起建立 Python 排程抓取。
- 每次抓取寫入 SQLite，累積自己的 PM2.5 時間序列。
- 儲存欄位至少包含 source dataset、site id、site name、county、longitude、latitude、publish/monitor time、PM2.5、PM2.5_AVG、fetched_at、raw snapshot reference。

未來 schema 方向：

- `weather_observations`
- `air_quality_observations`
- `stations`
- `raw_snapshots`
- `fetch_logs`

不要把 forecast、observation、air quality 混進同一張語意不清的 table。

## 11. Dashboard 功能範圍

MVP UI：

- OSM/MapLibre 主地圖。
- CWA weather station markers。
- PM2.5 station markers 或 PM2.5 marker mode。
- 縣市目前氣象/PM2.5 統計表。
- 最高溫/最低溫排行。
- 降水排行。
- 風速排行。
- PM2.5 縣市比較。
- 資料更新時間與來源狀態。
- 測站 popup：站名、站號、縣市、鄉鎮、觀測時間、氣溫、降水、風速、風向、濕度、PM2.5。

統計規則：

- 氣溫、降水、風速、濕度：縣市 min/max/average。
- 風向：使用向量平均或 circular mean，不可用普通算術平均。
- PM2.5：縣市 min/max/average。
- 缺值：不納入數值統計，並回傳 valid station count。

## 12. 明確排除項目

MVP 不做：

- 完整 AQI dashboard。
- PM10、O3、NO2、SO2、CO 前端分析。
- 多污染物空污研究。
- 未來天氣預報。
- 長期歷史氣候分析。
- 多年資料回補。
- 年度比較圖。
- 季節性分析。
- 極端氣候統計。
- 機器學習模型。
- AI 預測。

雷達、衛星、雲圖、UV、紅外線雲圖不列入 MVP。只有在第三方視覺層授權、穩定性與 fallback 都通過後，才重新評估。

## 13. 未來擴充方向

第二階段可加入：

- CWA 與 MOENV 歷史資料。
- 各縣市年度氣溫、雨量、風速、濕度、PM2.5 趨勢。
- 年度比較。
- 季節性分析。
- 極端高溫日數。
- 強降雨日數。
- PM2.5 超標日數。
- 縣市排名。
- 時間序列圖。
- 累積足夠資料後再做機器學習預測。
- 若 SQLite 不足，再升級 PostgreSQL/PostGIS。

## 14. 開發順序

1. 完成 API research 與 MVP 決策。
2. 整理後端設定：`CWA_API_KEY`、CWA dataset、`MOENV_API_KEY`、MOENV dataset、`VITE_API_BASE_URL`。
3. 建立小型 source clients：CWA observation client、MOENV PM2.5 client。
4. 建立 validation scripts：筆數、縣市覆蓋、欄位缺值率、sample schema dump，且不輸出 secrets。
5. 以 migration-safe 方式調整 SQLite schema。
6. 實作 weather observation 與 PM2.5 normalization。
7. 建立 summary API：
   - `/api/weather/latest`
   - `/api/weather/counties`
   - `/api/weather/stations.geojson`
   - `/api/pm25/latest`
   - `/api/summary/counties`
   - `/api/health`
8. 固定 OSM/MapLibre 主地圖，移除 Windy 與第三方天氣疊圖。
9. 加入 CWA 與 PM2.5 markers。
10. 加入縣市統計、表格、排行。
11. 更新 README 與 `.env.example`。
12. 新 API 穩定後，再移除或降級舊 forecast UI/API。

## 15. 測試方式

後端：

- `python scripts/init_db.py`
- `python scripts/run_crawler.py` 或新 source-specific scripts。
- `python -c "import api.main; import crawler.service; import database.init_db"`
- FastAPI `/api/health`
- validation script with redacted output。

前端：

- `npm run build`
- TypeScript compile。
- marker 是否顯示。
- 切換指標是否更新 marker 與縣市統計。
- 雲端前端 `VITE_API_BASE_URL` 是否正確指向後端。

資料錯誤情境：

- CWA key missing。
- CWA unauthorized。
- dataset not found。
- MOENV key missing。
- MOENV API 500/rate limit。
- 必要欄位缺失。
- 沒有最新觀測資料。

## 16. 已知風險

- 雲端部署若使用 SQLite，必須確認 database path 在 persistent disk/volume。
- refresh endpoints 正式公開前需要權限控管。
- `O-A0003-001` 雖然 enum 有 `UVIndex`，但實際覆蓋率需 live 驗證。
- `Now` 欄位語意需確認，避免把非降水資料標成降水量。
- 縣市統計必須回傳有效樣本數，避免平均值誤導。
- 風向必須用向量平均/circular mean。
