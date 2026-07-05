# API 數據來源與可用性盤點

前端「API 數據來源」區塊只顯示目前已成功接入並由系統使用的資料來源。畫面依機關單位分組，例如中央氣象署、環境部。游標移到機關項目上時會顯示來源明細；點擊機關項目可固定明細，再點擊一次可隱藏。

## 目前已接入來源

| Provider | Dataset / Service | 用途 | 經緯度狀態 | 狀態 |
| --- | --- | --- | --- | --- |
| CWA | `O-A0003-001` | 即時氣象觀測：氣溫、濕度、風速、能見度、天氣現象 | 測站經緯度 | Active |
| CWA | `O-A0001-001` | 自動氣象站觀測補充 | 測站經緯度 | Active |
| CWA | `O-A0002-001` | 雨量站觀測：近10分降雨、近24時降雨 | 雨量站經緯度 | Active |
| CWA | `E-A0015-001` | 地震報告：震央、規模、深度、最大震度、震度測站 | 震央與震度測站經緯度 | Active |
| CWA | `E-A0016-001` | 小區域有感地震：震央與震度測站 | 震央與震度測站經緯度 | Active |
| MOENV | `aqx_p_432` | 空氣品質監測：PM2.5、PM10、O3 8hr、CO 8hr、SO2、NO2 | 空品測站經緯度 | Active |

OpenStreetMap 與 Windy 屬於地圖服務，不列入 API source stack 的數據來源分組。

## 同步狀態

系統提供 `GET /api/sync/status`，用於顯示每個資料來源的最近同步狀態。前端不再只顯示模糊的同步警告，而會依資料來源顯示 `success`、`failed` 或 `unknown`。

| 狀態 | 意義 |
| --- | --- |
| `ok` | 所有已接入資料來源最近同步成功。 |
| `warning` | 至少一個資料來源失敗或尚未同步，但核心資料沒有全部失效。 |
| `error` | 核心資料來源均無法同步，需優先檢查 API key、網路或欄位格式。 |

`POST /api/refresh/observations` 現在會回傳每個來源的同步結果，即使部分失敗也不直接用 HTTP 500 中斷前端流程。

## 觀測圖層設計

Header 只保留底圖模式：`OSM` 與 `Windy`。地震不再作為 Header 主頁面，而是移到 LayerControl 的資料圖層：

| 資料圖層 | 說明 |
| --- | --- |
| 氣象 / 雨量 / 空品 | 顯示測站型連續觀測指標。 |
| 地震事件 | 顯示地震震央與最新事件的震度測站。 |

## 不接入點位的資料來源

| Dataset | 判斷 | 原因 |
| --- | --- | --- |
| `A-B0062-001` | 不做點位 | 檢查樣本未發現經緯度欄位，適合未來做查詢卡片而非 marker。 |
| `W-C0033-001` | 不做點位 | 檢查樣本未發現經緯度欄位，若要使用應做縣市或區域 polygon highlight。 |
| `W-C0033-006` | 不接入 | API 樣本檢查回傳 404。 |

## 雨量欄位

目前前端雨量展示分為兩個指標：

| 指標 | 欄位 | 說明 |
| --- | --- | --- |
| 近10分降雨 | `rainfall_10min` | 讀取 CWA 最近 10 分鐘雨量欄位，用於即時強降雨監測。 |
| 近24時降雨 | `rainfall_24h` | 讀取 CWA 過去 24 小時累積雨量欄位。若 API 未提供值，後端保留 `null`，前端不補成 0。 |

`rainfall_today` 不再作為前端功能與主要資料欄位。舊資料庫若已存在該欄位，僅作為歷史相容欄位，不再由 UI 使用。

可用以下指令檢查 CWA 雨量 raw response 是否真的提供 24 小時欄位：

```powershell
$env:CWA_API_KEY="你的CWA_KEY"
python scripts/check_rainfall_fields.py
```

## 地震功能

地震資料由 `E-A0015-001` 與 `E-A0016-001` 提供。後端保存兩種座標：

| 類型 | 欄位 |
| --- | --- |
| 震央點 | `EarthquakeInfo.Epicenter.EpicenterLatitude` / `EpicenterLongitude` |
| 震度測站 | `Intensity.ShakingArea[].EqStation[].StationLatitude` / `StationLongitude` |

前端資料圖層切換到「地震事件」時，OSM 底圖顯示震央與震度測站，Windy 底圖顯示震央 marker。

## 空氣污染物指標

前端直接呈現環境部空氣品質監測資料中的污染物觀測值：`PM2.5`、`PM10`、`O3 8hr`、`CO 8hr`、`SO2`、`NO2`。AQI 綜合分數仍可保存於資料庫，但不作為前端主要切換指標。
