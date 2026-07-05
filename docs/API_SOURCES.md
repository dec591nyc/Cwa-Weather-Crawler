# API 數據來源與可用性盤點

本文件整理目前專案使用與候選的 CWA / MOENV API。判斷重點是：是否能拿到經緯度、是否適合做地圖點位、是否已接入目前後端流程，以及需要補上的 normalization / join 邏輯。

## 目前已接入

| Provider | Dataset | 用途 | 經緯度狀態 | 目前狀態 |
| --- | --- | --- | --- | --- |
| CWA | `O-A0003-001` | 即時氣象觀測、氣溫、風速、濕度、能見度、累積雨量欄位預留 | 測站 WGS84 座標，可直接畫點 | Active |
| MOENV | `aqx_p_432` | AQI、空品狀態、指標污染物、PM2.5、PM10、O3、CO、NO2、SO2 | 空品站座標，可直接畫點 | Active |
| CWA | `F-D0047-093` | 鄉鎮天氣預報 | 需要依原始資料座標或 geocode join；不建議混入即時觀測圖層 | Optional |

## 候選 API

| Dataset | 類型 | 是否適合地圖 | 經緯度判斷 | 建議開發方式 |
| --- | --- | --- | --- | --- |
| `O-A0001-001` | 自動氣象站觀測 | 適合 | 通常具測站座標 | 可補足 O-A0003-001 站點密度，先做欄位相容性測試 |
| `O-A0002-001` | 自動雨量站觀測 | 很適合 | 通常具雨量站座標 | 建議作為累積雨量專層，支援 1h / 3h / 6h / 12h / 24h |
| `A-B0062-001` | 日出日沒 | 可做，但偏資訊卡 | 若原始資料無直接座標，需用 geocode 或行政區中心點 join | 適合做縣市或鄉鎮日出日落卡片，不一定需要獨立 map marker |
| `W-C0033-001` | 天氣警特報 | 可做區域圖 | 通常偏行政區或影響區域，不一定是單點座標 | 建議用縣市 polygon / badge，不要做測站點位 |
| `W-C0033-006` | 警特報影響區域 | 可做區域圖 | 需要行政區 join | 可與 `W-C0033-001` 搭配做警戒區域視覺化 |
| `E-A0015-001` | 地震報告 | 適合 | 震央通常具經緯度 | 可新增震央 marker，依規模、深度、時間篩選 |
| `E-A0016-001` | 地震震度 | 適合 | 可能為測站震度或行政區震度 | 實作時需依 raw response 決定 station join 或 area join |

## AQI 定義與資料來源

目前專案的 AQI 不在後端自行用 PM2.5 推算，而是直接使用環境部 `aqx_p_432` 回傳的 `aqi` 欄位。原因是 AQI 不是單一 PM2.5 數值，而是由多項污染物的分指標比較後形成的綜合指標；官方資料已經包含 AQI、空品狀態、指標污染物與多個污染物濃度欄位，因此系統應保存官方發布結果，避免自行推算造成數值與官方不一致。

目前已保存的空品欄位包含：`aqi`、`status`、`pollutant`、`pm25`、`pm25_avg`、`pm10`、`pm10_avg`、`so2`、`co`、`co_8hr`、`o3`、`o3_8hr`、`no2`、`nox`、`no`。

## 能見度缺值判斷

能見度沒有資料時，不一定代表 API 壞掉。比較常見原因是：該 dataset / 測站沒有回傳 `Visibility` 或 `VisibilityDescription`，或 CWA 對不同測站等級提供的觀測項目不同。這次已在 CWA request 參數加入 `Visibility`、`VisibilityDescription`，也在 DB 加入 `visibility_km` 與 `visibility_description`；若刷新後仍為空，代表目前資料源該批測站沒有提供能見度，下一步應改測 `O-A0001-001` 或其他觀測資料集是否更完整。

## 累積雨量開發狀態

目前 DB 與 normalization 已預留：`rainfall_10min`、`rainfall_1h`、`rainfall_3h`、`rainfall_6h`、`rainfall_12h`、`rainfall_24h`。前端已先加入 `24h累積雨量` 指標。若 `O-A0003-001` 實際回傳不足，下一步應接入 `O-A0002-001` 作為累積雨量主要來源。

## Legacy 清理

已移除舊的 `/api/temperature/geojson` route。現在即時氣象地圖統一使用 `/api/weather/stations.geojson`，空品資料使用 `/api/pm25/latest` 或 `/api/air-quality/latest`，API 來源盤點使用 `/api/data-sources`。
