#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Central Weather Administration (CWA) Open Data Crawler
Specifically retrieves the "One-Week Agricultural Weather Forecast" (F-A0010-001)
and displays it in a beautiful, readable terminal layout or saves it to files.
"""

import os
import sys
import json
import argparse
from datetime import datetime
import urllib3
import requests

# Suppress SSL warnings due to CWA's potential certificate chain verification issues in Python
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Default dataset for One-Week Agricultural Weather Forecast
DEFAULT_DATA_ID = "F-A0010-001"
API_URL = "https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/{data_id}"

# ANSI Terminal Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def disable_colors():
    Colors.HEADER = ''
    Colors.BLUE = ''
    Colors.CYAN = ''
    Colors.GREEN = ''
    Colors.YELLOW = ''
    Colors.RED = ''
    Colors.END = ''
    Colors.BOLD = ''
    Colors.UNDERLINE = ''

def get_weather_emoji(weather_desc: str) -> str:
    """Map Taiwanese weather descriptions to representative emojis."""
    desc = weather_desc or ""
    if "雷" in desc:
        return "⛈️"
    elif "雨" in desc:
        if "短暫" in desc or "陣雨" in desc:
            return "🌦️"
        return "🌧️"
    elif "陰" in desc:
        if "多雲" in desc:
            return "☁️"
        return "🌫️"
    elif "多雲" in desc:
        if "晴" in desc:
            return "⛅"
        return "☁️"
    elif "晴" in desc:
        return "☀️"
    return "🌡️"

def fetch_weather_data(api_key: str, data_id: str = DEFAULT_DATA_ID) -> dict:
    """Fetch JSON weather data from the CWA API endpoint."""
    url = API_URL.format(data_id=data_id)
    params = {
        "Authorization": api_key,
        "format": "JSON"
    }
    
    try:
        # We disable verification (verify=False) since CWA certificates frequently fail validation
        # in Python environments due to missing Subject Key Identifiers.
        response = requests.get(url, params=params, verify=False, timeout=15)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            print(f"{Colors.RED}[Error] Unauthorized: Please check if your API Key is correct.{Colors.END}")
            sys.exit(1)
        elif response.status_code == 404:
            print(f"{Colors.RED}[Error] Dataset {data_id} not found (404).{Colors.END}")
            sys.exit(1)
        else:
            print(f"{Colors.RED}[Error] Failed to fetch data. HTTP Status Code: {response.status_code}{Colors.END}")
            print(response.text)
            sys.exit(1)
            
    except requests.exceptions.RequestException as e:
        print(f"{Colors.RED}[Error] Network exception occurred: {e}{Colors.END}")
        sys.exit(1)

def parse_weather_data(raw_data: dict) -> dict:
    """Parse raw CWA API JSON structure into a simplified Python dictionary."""
    try:
        cwa_data = raw_data.get("cwaopendata", {})
        resource = cwa_data.get("resources", {}).get("resource", {})
        metadata = resource.get("metadata", {})
        data_section = resource.get("data", {})
        
        dataset_name = cwa_data.get("datasetName", "一週農業氣象預報")
        issue_time = metadata.get("temporal", {}).get("issueTime", "")
        valid_time = metadata.get("temporal", {}).get("validTime", {})
        
        agr_forecasts = data_section.get("agrWeatherForecasts", {})
        weather_profile = agr_forecasts.get("weatherProfile", "")
        
        # Parse Forecasts by Location
        locations_forecast = []
        loc_elements = agr_forecasts.get("weatherForecasts", {}).get("location", [])
        for loc in loc_elements:
            loc_name = loc.get("locationName", "")
            elements = loc.get("weatherElements", {})
            
            # Wx (Weather condition), MaxT (Max Temp), MinT (Min Temp)
            wx_daily = elements.get("Wx", {}).get("daily", [])
            maxt_daily = elements.get("MaxT", {}).get("daily", [])
            mint_daily = elements.get("MinT", {}).get("daily", [])
            
            daily_forecasts = []
            for i in range(len(wx_daily)):
                date = wx_daily[i].get("dataDate", "")
                weather = wx_daily[i].get("weather", "")
                
                # Align temperatures by date
                max_t = ""
                for t in maxt_daily:
                    if t.get("dataDate") == date:
                        max_t = t.get("temperature", "")
                        break
                        
                min_t = ""
                for t in mint_daily:
                    if t.get("dataDate") == date:
                        min_t = t.get("temperature", "")
                        break
                
                daily_forecasts.append({
                    "date": date,
                    "weather": weather,
                    "emoji": get_weather_emoji(weather),
                    "max_temp": max_t,
                    "min_temp": min_t
                })
                
            locations_forecast.append({
                "location": loc_name,
                "forecasts": daily_forecasts
            })
            
        # Parse Growing Degree Days (GDD) & Accumulated Temp
        agr_advices = agr_forecasts.get("agrAdvices", {})
        gdd_locations = []
        gdd_loc_list = agr_advices.get("agrForecasts", {}).get("location", [])
        for loc in gdd_loc_list:
            loc_name = loc.get("locationName", "")
            daily_gdd = loc.get("weatherElements", {}).get("daily", [])
            
            gdd_data = []
            for item in daily_gdd:
                gdd_data.append({
                    "date": item.get("dataDate", ""),
                    "degree_day": item.get("degreeDay", ""),
                    "accumulated_temp": item.get("accumulatedTemperature", "")
                })
            
            gdd_locations.append({
                "location": loc_name,
                "gdd_data": gdd_data
            })
            
        # Parse Crop Statistics (mainly Rice / 水稻)
        crop_stats = []
        crop_section = agr_advices.get("cropStatistics", {}).get("crop", {})
        if crop_section:
            crop_name = crop_section.get("cropName", "水稻")
            cardinals = crop_section.get("cardinalTemperatures", {}).get("growingStage", {})
            min_grow_t = cardinals.get("minimum", "")
            max_grow_t = cardinals.get("maximum", "")
            
            crop_locations = []
            crop_loc_list = crop_section.get("location", [])
            for loc in crop_loc_list:
                loc_name = loc.get("locationName", "")
                breed = loc.get("cropBreed", "")
                stats = loc.get("statistics", {})
                
                # 15 Years Average
                fifteen_yrs = []
                period_list = stats.get("fifteenYears", {}).get("timePeriod", [])
                if not isinstance(period_list, list):
                    period_list = [period_list] if period_list else []
                for p in period_list:
                    fifteen_yrs.append({
                        "stage": p.get("description", ""),
                        "days": p.get("growingDays", ""),
                        "accumulated_temp": p.get("accumulatedTemperature", "")
                    })
                    
                # This Year
                this_yr = stats.get("thisYear", {})
                this_yr_data = {
                    "description": this_yr.get("description", ""),
                    "dibbling_date": this_yr.get("dibblingDate", ""),
                    "end_date": this_yr.get("timePeriod", {}).get("endDate", ""),
                    "growing_days": this_yr.get("timePeriod", {}).get("growingDays", ""),
                    "accumulated_temp": this_yr.get("timePeriod", {}).get("accumulatedTemperature", "")
                }
                
                crop_locations.append({
                    "location": loc_name,
                    "breed": breed,
                    "fifteen_years": fifteen_yrs,
                    "this_year": this_yr_data
                })
                
            crop_stats = {
                "crop_name": crop_name,
                "temp_range": {"min": min_grow_t, "max": max_grow_t},
                "locations": crop_locations
            }
            
        return {
            "dataset_name": dataset_name,
            "issue_time": issue_time,
            "valid_time_start": valid_time.get("startTime", ""),
            "valid_time_end": valid_time.get("endTime", ""),
            "weather_profile": weather_profile,
            "forecasts": locations_forecast,
            "gdd": gdd_locations,
            "crop_statistics": crop_stats
        }
        
    except Exception as e:
        print(f"{Colors.RED}[Error] Failed to parse CWA JSON structure: {e}{Colors.END}")
        sys.exit(1)

def display_console_report(data: dict, selected_locations: list = None) -> None:
    """Format and print the weather data in a gorgeous, structured terminal layout."""
    # Header
    print(f"\n{Colors.BOLD}{Colors.HEADER}========================================================================={Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}                 🌾 {data['dataset_name']} 🌾{Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}========================================================================={Colors.END}")
    
    # Meta Information
    issue_dt = datetime.fromisoformat(data['issue_time']) if data['issue_time'] else None
    issue_str = issue_dt.strftime("%Y-%m-%d %H:%M") if issue_dt else "未知"
    
    start_dt = datetime.fromisoformat(data['valid_time_start']) if data['valid_time_start'] else None
    end_dt = datetime.fromisoformat(data['valid_time_end']) if data['valid_time_end'] else None
    period_str = f"{start_dt.strftime('%m/%d')} ~ {end_dt.strftime('%m/%d')}" if (start_dt and end_dt) else "未知"
    
    print(f"{Colors.BOLD}發布時間:{Colors.END} {issue_str}  |  {Colors.BOLD}有效期間:{Colors.END} {period_str}")
    print(f"{Colors.BOLD}{Colors.HEADER}-------------------------------------------------------------------------{Colors.END}")
    
    # General Weather Profile
    print(f"{Colors.BOLD}{Colors.YELLOW}📢 一週天氣概況:{Colors.END}")
    profile_text = data['weather_profile']
    # Wrap text nicely for clean terminal representation
    wrapped_lines = []
    width = 70
    for i in range(0, len(profile_text), width):
        wrapped_lines.append(profile_text[i:i+width])
    for line in wrapped_lines:
        print(f"  {line}")
    print(f"{Colors.BOLD}{Colors.HEADER}-------------------------------------------------------------------------{Colors.END}")

    # Location Forecasts
    print(f"{Colors.BOLD}{Colors.GREEN}📅 各地區氣象預報 (溫度 / 天氣 / 降雨類型):{Colors.END}")
    for loc_data in data['forecasts']:
        loc_name = loc_data['location']
        # Filter if user requested specific locations
        if selected_locations and loc_name not in selected_locations:
            continue
            
        print(f"\n  📍 {Colors.BOLD}{Colors.CYAN}{loc_name}{Colors.END}:")
        
        # Table Header
        print(f"    ┌────────────┬──────┬─────────┬───────────────────────────────────┐")
        print(f"    │    日期    │ 溫度 │  氣象   │             天氣描述              │")
        print(f"    ├────────────┼──────┼─────────┼───────────────────────────────────┤")
        
        for day in loc_data['forecasts']:
            date_str = day['date']
            # Format Date for cleaner display (e.g. 2026-06-25 -> 06-25)
            short_date = date_str[5:] if len(date_str) >= 10 else date_str
            temp_range = f"{day['min_temp']}-{day['max_temp']}°C"
            emoji = day['emoji']
            weather_desc = day['weather']
            
            # Simple text padding to fit within visual borders
            # Chinese characters are double-width in most Asian fonts but count as length=1 in Python
            # This is a naive alignment helper.
            pad_len = 30 - sum(2 if ord(char) > 127 else 1 for char in weather_desc)
            pad_len = max(0, pad_len)
            padded_desc = weather_desc + " " * pad_len
            
            print(f"    │   {short_date}    │{temp_range:^6}│   {emoji}    │ {padded_desc} │")
            
        print(f"    └────────────┴──────┴─────────┴───────────────────────────────────┘")
        
    print(f"\n{Colors.BOLD}{Colors.HEADER}-------------------------------------------------------------------------{Colors.END}")
    
    # GDD / Accumulated Temperature
    print(f"{Colors.BOLD}{Colors.GREEN}📈 農業生長積溫統計 (度日 GDD / 累積溫度):{Colors.END}")
    for gdd_data in data['gdd']:
        loc_name = gdd_data['location']
        if selected_locations and loc_name not in selected_locations:
            continue
            
        print(f"\n  📍 {Colors.BOLD}{Colors.CYAN}{loc_name}{Colors.END}:")
        
        # Display as horizontal list or row to save space
        row_dates = []
        row_gdds = []
        row_accs = []
        for d in gdd_data['gdd_data'][:7]: # Display first 7 days
            short_date = d['date'][5:] if len(d['date']) >= 10 else d['date']
            row_dates.append(f" {short_date} ")
            row_gdds.append(f" {float(d['degree_day']):>4.1f} ")
            row_accs.append(f" {float(d['accumulated_temp']):>4.1f} ")
            
        print(f"    日期: |" + "|".join(row_dates) + "|")
        print(f"    度日: |" + "|".join(row_gdds) + "|")
        print(f"    積溫: |" + "|".join(row_accs) + "|")
        
    print(f"\n{Colors.BOLD}{Colors.HEADER}-------------------------------------------------------------------------{Colors.END}")
    
    # Rice Statistics if available
    crop = data['crop_statistics']
    if crop:
        print(f"{Colors.BOLD}{Colors.YELLOW}🌾 主要作物生長積溫參考: {crop['crop_name']}{Colors.END} (生長最適範圍: {crop['temp_range']['min']} ~ {crop['temp_range']['max']}°C)")
        for loc in crop['locations']:
            print(f"\n  📍 {Colors.BOLD}{Colors.CYAN}{loc['location']}{Colors.END} - {loc['breed']}:")
            print(f"    歷史15年平均生育參考:")
            for p in loc['fifteen_years']:
                print(f"      - {p['stage']}: {p['days']}天 | 累積積溫: {p['accumulated_temp']} GDD")
            
            this_yr = loc['this_year']
            if this_yr and this_yr['end_date'] and this_yr['end_date'] != "-":
                print(f"    本年度實測 (至 {this_yr['end_date']}):")
                print(f"      - 插秧日期: {this_yr['dibbling_date']} | 已生育日數: {this_yr['growing_days']}天 | 目前累積積溫: {this_yr['accumulated_temp']} GDD")
            else:
                print(f"    本年度實測: 暫無近期觀測資料 (目前為休耕或尚未進入申報期)")

    print(f"\n{Colors.BOLD}{Colors.HEADER}========================================================================={Colors.END}\n")

def generate_markdown_report(data: dict, filepath: str) -> None:
    """Generate a clean and beautifully structured markdown report file."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# 🌾 CWA {data['dataset_name']} 🌾\n\n")
            
            issue_dt = datetime.fromisoformat(data['issue_time']) if data['issue_time'] else None
            issue_str = issue_dt.strftime("%Y-%m-%d %H:%M") if issue_dt else "未知"
            
            start_dt = datetime.fromisoformat(data['valid_time_start']) if data['valid_time_start'] else None
            end_dt = datetime.fromisoformat(data['valid_time_end']) if data['valid_time_end'] else None
            period_str = f"{start_dt.strftime('%m/%d')} ~ {end_dt.strftime('%m/%d')}" if (start_dt and end_dt) else "未知"
            
            f.write(f"**發布時間**：{issue_str}  \n")
            f.write(f"**有效預報期間**：{period_str}  \n\n")
            
            f.write("## 📢 一週天氣概況\n\n")
            f.write(f"> {data['weather_profile']}\n\n")
            
            f.write("## 📅 各地區氣象預報\n\n")
            for loc in data['forecasts']:
                f.write(f"### 📍 {loc['location']}\n\n")
                f.write("| 日期 | 溫度區間 | 天氣狀態 | 說明 |\n")
                f.write("| :--- | :---: | :---: | :--- |\n")
                for day in loc['forecasts']:
                    f.write(f"| {day['date']} | {day['min_temp']}-{day['max_temp']}°C | {day['emoji']} | {day['weather']} |\n")
                f.write("\n")
                
            f.write("## 📈 農業生長積溫統計 (度日 GDD / 累積溫度)\n\n")
            for gdd in data['gdd']:
                f.write(f"### 📍 {gdd['location']}\n\n")
                f.write("| 日期 | 度日 (GDD) | 累積溫度 |\n")
                f.write("| :--- | :---: | :---: |\n")
                for d in gdd['gdd_data']:
                    f.write(f"| {d['date']} | {d['degree_day']} | {d['accumulated_temp']} |\n")
                f.write("\n")
                
            crop = data['crop_statistics']
            if crop:
                f.write(f"## 🌾 主要作物生長積溫參考: {crop['crop_name']}\n\n")
                f.write(f"* 生長最適範圍：{crop['temp_range']['min']} ~ {crop['temp_range']['max']}°C\n\n")
                
                for loc in crop['locations']:
                    f.write(f"### 📍 {loc['location']} ({loc['breed']})\n\n")
                    f.write("#### 歷史 15 年平均發育期參考：\n")
                    for p in loc['fifteen_years']:
                        f.write(f"- **{p['stage']}**：歷時 `{p['days']}` 天，需累積積溫 `{p['accumulated_temp']}` GDD\n")
                    f.write("\n")
                    
                    this_yr = loc['this_year']
                    if this_yr and this_yr['end_date'] and this_yr['end_date'] != "-":
                        f.write("#### 本年度近期實測：\n")
                        f.write(f"- 插秧日期：`{this_yr['dibbling_date']}`\n")
                        f.write(f"- 統計截止日期：`{this_yr['end_date']}`\n")
                        f.write(f"- 已生育日數：`{this_yr['growing_days']}` 天\n")
                        f.write(f"- 已累積積溫：`{this_yr['accumulated_temp']}` GDD\n")
                    else:
                        f.write("#### 本年度近期實測：\n*暫無近期觀測資料 (可能為休耕或尚未進入申報期)*\n")
                    f.write("\n---\n\n")
                    
        print(f"{Colors.GREEN}[Success] Markdown report successfully written to {filepath}{Colors.END}")
    except Exception as e:
        print(f"{Colors.RED}[Error] Failed to write markdown report to {filepath}: {e}{Colors.END}")

def main():
    # Try to reconfigure stdout to UTF-8 to support Emojis and Chinese characters on Windows
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    parser = argparse.ArgumentParser(
        description="Crawl and display Taiwan Central Weather Administration (CWA) Agricultural Weather Forecasts (F-A0010-001)."
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="CWA API Key. If not provided, it will check the CWA_API_KEY environment variable.",
    )
    parser.add_argument(
        "--location",
        type=str,
        help="Comma-separated locations to filter (e.g., '北部地區,中部地區,南部地區').",
    )
    parser.add_argument(
        "--save-raw",
        type=str,
        help="Path to save the raw retrieved JSON data (e.g., raw_response.json).",
    )
    parser.add_argument(
        "--save-report",
        type=str,
        help="Path to save the parsed beautiful Markdown report (e.g., report.md).",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable ANSI colors in terminal outputs.",
    )
    
    args = parser.parse_args()
    
    if args.no_color:
        disable_colors()
        
    # Get API Key from arguments, environment or interactive prompt
    api_key = args.api_key or os.environ.get("CWA_API_KEY")
    if not api_key:
        print(f"{Colors.BOLD}{Colors.YELLOW}No CWA API Key detected.{Colors.END}")
        api_key = input("Enter your CWA API Key (format: CWA-XXXXXXXX-...): ").strip()
        if not api_key:
            print(f"{Colors.RED}[Error] API Key is required to run this script. Exiting.{Colors.END}")
            sys.exit(1)
            
    # Process Location Filters
    selected_locations = None
    if args.location:
        selected_locations = [loc.strip() for loc in args.location.split(",") if loc.strip()]
        
    print(f"{Colors.BLUE}[Status] Connecting to CWA API to fetch One-Week Agricultural Forecasts...{Colors.END}")
    
    raw_data = fetch_weather_data(api_key, DEFAULT_DATA_ID)
    
    # Save raw JSON if requested
    if args.save_raw:
        try:
            with open(args.save_raw, "w", encoding="utf-8") as f:
                json.dump(raw_data, f, ensure_ascii=False, indent=2)
            print(f"{Colors.GREEN}[Success] Raw response saved to {args.save_raw}{Colors.END}")
        except Exception as e:
            print(f"{Colors.RED}[Error] Failed to write raw JSON response: {e}{Colors.END}")
            
    # Parse the data
    parsed_data = parse_weather_data(raw_data)
    
    # Display Terminal Report
    display_console_report(parsed_data, selected_locations)
    
    # Save Markdown Report if requested
    if args.save_report:
        generate_markdown_report(parsed_data, args.save_report)

if __name__ == "__main__":
    main()
