import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings
from crawler.cwa_client import CwaClient
from crawler.moenv_client import MoenvClient
from crawler.normalize import normalize_cwa_observations, normalize_moenv_pm25

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def missing_report(records: list[dict[str, Any]], fields: list[str]) -> dict[str, Any]:
    total = len(records)
    report: dict[str, Any] = {"total": total, "fields": {}}
    for field in fields:
        missing = sum(1 for record in records if record.get(field) is None)
        report["fields"][field] = {
            "missing": missing,
            "missing_rate": round(missing / total, 4) if total else None,
        }
    return report


def print_weather_validation() -> None:
    print("== CWA weather observation validation ==")
    client = CwaClient(settings.cwa_api_key, settings.cwa_observation_dataset_id)
    raw, response_ms = client.fetch(
        {
            "WeatherElement": [
                "Weather",
                "Now",
                "WindDirection",
                "WindSpeed",
                "AirTemperature",
                "RelativeHumidity",
                "UVIndex",
                "DailyHigh",
                "DailyLow",
            ],
            "GeoInfo": [
                "Coordinates",
                "StationAltitude",
                "CountyName",
                "TownName",
                "CountyCode",
                "TownCode",
            ],
        }
    )
    records = normalize_cwa_observations(raw, settings.cwa_observation_dataset_id)
    counties = sorted({record.get("county") for record in records if record.get("county")})
    print(f"dataset={settings.cwa_observation_dataset_id}")
    print(f"response_ms={response_ms}")
    print(f"records={len(records)}")
    print(f"county_count={len(counties)}")
    print(f"counties={', '.join(counties)}")
    print(missing_report(records, [
        "station_id",
        "station_name",
        "county",
        "town",
        "lat",
        "lon",
        "observed_at",
        "temperature",
        "rainfall",
        "wind_speed",
        "wind_direction",
        "humidity",
        "uv_index",
    ]))


def print_pm25_validation() -> None:
    print("== MOENV PM2.5 validation ==")
    client = MoenvClient(settings.moenv_api_key, settings.moenv_pm25_dataset_id)
    raw, response_ms = client.fetch()
    records = normalize_moenv_pm25(raw, settings.moenv_pm25_dataset_id)
    counties = sorted({record.get("county") for record in records if record.get("county")})
    county_counts = Counter(record.get("county") for record in records if record.get("county"))
    print(f"dataset={settings.moenv_pm25_dataset_id}")
    print(f"response_ms={response_ms}")
    print(f"records={len(records)}")
    print(f"county_count={len(counties)}")
    print(f"top_counties={county_counts.most_common(10)}")
    print(missing_report(records, [
        "station_id",
        "station_name",
        "county",
        "lat",
        "lon",
        "observed_at",
        "pm25",
        "pm25_avg",
    ]))


if __name__ == "__main__":
    failures: list[str] = []
    for name, fn in (
        ("CWA", print_weather_validation),
        ("MOENV", print_pm25_validation),
    ):
        try:
            fn()
        except Exception as exc:
            failures.append(f"{name}: {exc}")
            print(f"{name} validation failed: {exc}")

    if failures:
        raise SystemExit(1)
