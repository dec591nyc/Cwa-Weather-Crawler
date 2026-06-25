# Taiwan CWA Agricultural Weather Crawler 🌾

This project is a Python crawler and reporting tool for the Taiwan **Central Weather Administration (CWA)** Open Data API. Specifically, it retrieves the **"One-Week Agricultural Weather Forecast"** (dataset code: `F-A0010-001`) and presents it in a beautiful console table or generates a structured Markdown report.

## Features

- **Gorgeous CLI UI**: Formats regional weekly forecasts with custom weather emojis and neatly aligned layouts.
- **Accurate Agricultural Analytics**: Parses and displays Growing Degree Days (GDD), accumulated temperature projections, and rice cultivation statistics.
- **Flexible Options**: Filter by location, save raw JSON responses, and write complete Markdown reports.
- **Robust Network & SSL Handling**: Gracefully bypasses Python's SSL verification issues with CWA's HTTPS certificate.

## Workspace Directory

The files are located in:
`C:\Users\admin\.gemini\antigravity-ide\scratch\cwa-weather-crawler`

> [!TIP]
> It is highly recommended to set this directory as your active workspace in your IDE to easily run, edit, and view the files.

## Installation

1. Open your terminal in this project folder.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### 1. Basic Run (Interactive)
If you run without arguments, the script will prompt you for your CWA API Key:
```bash
python cwa_crawler.py
```

### 2. Supply API Key via Environment Variable
You can export the API Key as `CWA_API_KEY` to avoid being prompted:
```bash
# PowerShell
$env:CWA_API_KEY="CWA-E3D48014-5F0F-443D-A51A-85B7ACA21252"
python cwa_crawler.py
```

### 3. Filter by Region
Filter the output to show specific areas (comma-separated):
```bash
python cwa_crawler.py --api-key YOUR_API_KEY --location "北部地區,中部地區"
```

### 4. Exporting Data
Save the raw JSON data and generate a parsed Markdown report:
```bash
python cwa_crawler.py --api-key YOUR_API_KEY --save-raw raw.json --save-report report.md
```

## Files in this Directory

- [cwa_crawler.py](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/cwa-weather-crawler/cwa_crawler.py): The main Python crawler and renderer.
- [requirements.txt](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/cwa-weather-crawler/requirements.txt): External package dependencies.
- [README.md](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/cwa-weather-crawler/README.md): Documentation.
- [report.md](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/cwa-weather-crawler/report.md): Output markdown report generated from testing.
- [raw.json](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/cwa-weather-crawler/raw.json): Raw API response output from testing.
