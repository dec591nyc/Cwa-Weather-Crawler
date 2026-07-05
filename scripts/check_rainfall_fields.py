from __future__ import annotations

import json
import os
from typing import Any

import requests
import urllib3

CWA_REST_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/{dataset_id}"
RAINFALL_DATASET_ID = os.getenv("CWA_RAINFALL_DATASET_ID", "O-A0002-001")
CANDIDATE_KEYS = {
    "Now", "Past10Min", "Past1hr", "Past24hr", "Past24Hour", "Past24Hr", "Past24Hours", "Hour24Rainfall",
    "DailyRainfall", "TodayRainfall", "DailyAccumulatedPrecipitation",
}

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def walk_json(value: Any, path: str = "") -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else key
            if key in CANDIDATE_KEYS:
                matches.append({"path": child_path, "sample_value": child})
            matches.extend(walk_json(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value[:5]):
            matches.extend(walk_json(child, f"{path}[{index}]"))
    return matches


def main() -> None:
    api_key = os.getenv("CWA_API_KEY")
    if not api_key:
        raise SystemExit("CWA_API_KEY is required")
    response = requests.get(
        CWA_REST_URL.format(dataset_id=RAINFALL_DATASET_ID),
        params={"Authorization": api_key, "format": "JSON", "limit": 5},
        timeout=30,
        verify=False,
    )
    response.raise_for_status()
    payload = response.json()
    matches = walk_json(payload)
    print(json.dumps({"dataset_id": RAINFALL_DATASET_ID, "candidate_count": len(matches), "matches": matches}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
