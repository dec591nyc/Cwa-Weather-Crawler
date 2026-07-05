from __future__ import annotations

import json
import os
from collections.abc import Iterable
from typing import Any

import requests

CWA_REST_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/{dataset_id}"
CANDIDATE_DATASETS = [
    "O-A0001-001",
    "A-B0062-001",
    "W-C0033-001",
    "W-C0033-006",
    "E-A0015-001",
    "E-A0016-001",
]
COORDINATE_KEYWORDS = (
    "lat",
    "latitude",
    "lon",
    "lng",
    "longitude",
    "stationlatitude",
    "stationlongitude",
    "epicenterlatitude",
    "epicenterlongitude",
)


def walk_json(value: Any, path: str = "$") -> Iterable[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            yield child_path, child
            yield from walk_json(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value[:3]):
            child_path = f"{path}[{index}]"
            yield child_path, child
            yield from walk_json(child, child_path)


def find_coordinate_fields(payload: dict[str, Any]) -> list[dict[str, str]]:
    matches: list[dict[str, str]] = []
    for path, value in walk_json(payload):
        key = path.rsplit(".", 1)[-1].lower().replace("_", "")
        if any(keyword in key for keyword in COORDINATE_KEYWORDS):
            matches.append({"path": path, "sample_value": str(value)[:80]})
    return matches[:30]


def fetch_dataset(dataset_id: str, api_key: str) -> dict[str, Any]:
    response = requests.get(
        CWA_REST_URL.format(dataset_id=dataset_id),
        params={"Authorization": api_key, "format": "JSON", "limit": 3},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def main() -> None:
    api_key = os.getenv("CWA_API_KEY")
    if not api_key:
        raise SystemExit("CWA_API_KEY is required")

    report = []
    for dataset_id in CANDIDATE_DATASETS:
        try:
            payload = fetch_dataset(dataset_id, api_key)
            coordinate_fields = find_coordinate_fields(payload)
            report.append(
                {
                    "dataset_id": dataset_id,
                    "status": "ok",
                    "has_coordinate_fields": bool(coordinate_fields),
                    "coordinate_fields": coordinate_fields,
                }
            )
        except Exception as exc:
            report.append({"dataset_id": dataset_id, "status": "failed", "error": str(exc)})

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
