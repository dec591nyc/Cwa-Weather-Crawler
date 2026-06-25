# 臺灣中央氣象署農業氣象爬蟲程式 🌾

本專案是一個用於對接臺灣**中央氣象署 (CWA)** 開放資料 API 的 Python 爬蟲與報告生成工具。特別針對 **「一週農業氣象預報」**（資料集代碼：`F-A0010-001`）進行資料存取，並在終端機中呈現美觀的表格 layout，或自動生成結構化的 Markdown 報告。

## 功能特點

- **精美的終端機 UI**：使用自訂氣象表情符號（Emoji）與對齊排版，視覺化呈現各地區的一週天氣預報。
- **精準的農業數據分析**：解析並展示度日（GDD）、累積溫度預測以及水稻生育積溫統計。
- **彈性的指令參數**：支援指定地區過濾、儲存原始 JSON 格式回傳，以及輸出精美的 Markdown 報告。
- **健全的網路與 SSL 處理**：針對氣象署 HTTPS 憑證在 Python 環境下常遇到的 SSL 驗證失敗問題進行了自動跳過與錯誤處理。

## 工作區路徑

本專案檔案位於：
`C:\Users\admin\Documents\cwa-weather-crawler`

> [!TIP]
> 強烈建議在您的 IDE 中將此目錄設為「活動工作區」（Active Workspace），以便於執行、編輯和檢視相關檔案。

## 安裝說明

1. 在此專案資料夾下開啟終端機。
2. 安裝必要的相依套件：
   ```bash
   pip install -r requirements.txt
   ```

## 使用方法

### 1. 基本執行（互動模式）
若執行時未帶入參數，程式將提示您輸入您的氣象署 API 授權碼：
```bash
python cwa_crawler.py
```

### 2. 使用環境變數設定 API 金鑰
您可以將 API 金鑰設定為 `CWA_API_KEY` 環境變數，以避免每次執行都需要手動輸入：
```bash
# PowerShell
$env:CWA_API_KEY="CWA-E3D48014-5F0F-443D-A51A-85B7ACA21252"
python cwa_crawler.py
```

### 3. 按地區篩選
過濾輸出以僅顯示特定區域（使用逗號分隔多個地區）：
```bash
python cwa_crawler.py --api-key 您的API授權碼 --location "北部地區,中部地區"
```

### 4. 匯出資料與報告
儲存 API 原始 JSON 回傳結果並生成解析後的 Markdown 報告：
```bash
python cwa_crawler.py --api-key 您的API授權碼 --save-raw raw.json --save-report report.md
```

## 目錄檔案說明

- [cwa_crawler.py](file:///C:/Users/admin/Documents/cwa-weather-crawler/cwa_crawler.py): 核心 Python 爬蟲與渲染指令碼。
- [requirements.txt](file:///C:/Users/admin/Documents/cwa-weather-crawler/requirements.txt): 外部套件依賴清單。
- [README.md](file:///C:/Users/admin/Documents/cwa-weather-crawler/README.md): 專案說明文件（本檔案）。
- [report.md](file:///C:/Users/admin/Documents/cwa-weather-crawler/report.md): 測試執行時生成的精美 Markdown 天氣報告。
- [raw.json](file:///C:/Users/admin/Documents/cwa-weather-crawler/raw.json): 測試執行時取得的原始 API JSON 回傳資料。
