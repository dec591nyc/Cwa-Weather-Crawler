from __future__ import annotations

import time
from typing import Any

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

MOENV_API_URL = "https://data.moenv.gov.tw/api/v2/{dataset_id}"


class MoenvClient:
    def __init__(self, api_key: str, dataset_id: str) -> None:
        if not api_key:
            raise ValueError("MOENV_API_KEY is required")
        self.api_key = api_key
        self.dataset_id = dataset_id

    def fetch(self, extra_params: dict[str, Any] | None = None) -> tuple[dict[str, Any], int]:
        url = MOENV_API_URL.format(dataset_id=self.dataset_id)
        params: dict[str, Any] = {
            "api_key": self.api_key,
            "format": "json",
            "limit": 1000,
            "offset": 0,
        }
        if extra_params:
            params.update(extra_params)

        start = time.perf_counter()
        try:
            response = requests.get(url, params=params, timeout=30, verify=False)
        except requests.RequestException as exc:
            raise RuntimeError(f"MOENV request failed before response: {exc.__class__.__name__}") from exc
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if response.status_code in {401, 403}:
            raise RuntimeError("Unauthorized: check MOENV_API_KEY")
        if response.status_code == 404:
            raise RuntimeError(f"MOENV dataset not found: {self.dataset_id}")
        if response.status_code == 429:
            raise RuntimeError("MOENV API rate limit reached")
        if response.status_code >= 400:
            raise RuntimeError(f"MOENV request failed: HTTP {response.status_code} {response.text[:300]}")

        try:
            return response.json(), elapsed_ms
        except ValueError as exc:
            raise RuntimeError(f"MOENV response is not JSON: {response.text[:300]}") from exc
