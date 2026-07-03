from __future__ import annotations

import time
from typing import Any
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CWA_REST_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/{dataset_id}"


class CwaClient:
    def __init__(self, api_key: str, dataset_id: str) -> None:
        if not api_key:
            raise ValueError("CWA_API_KEY is required")
        self.api_key = api_key
        self.dataset_id = dataset_id

    def fetch(self, extra_params: dict[str, Any] | None = None) -> tuple[dict[str, Any], int]:
        url = CWA_REST_URL.format(dataset_id=self.dataset_id)
        params = {"Authorization": self.api_key, "format": "JSON"}
        if extra_params:
            params.update(extra_params)
        start = time.perf_counter()
        try:
            response = requests.get(url, params=params, timeout=30, verify=False)
        except requests.RequestException as exc:
            raise RuntimeError(f"CWA request failed before response: {exc.__class__.__name__}") from exc
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if response.status_code == 401:
            raise RuntimeError("Unauthorized: check CWA_API_KEY")
        if response.status_code == 404:
            raise RuntimeError(f"Dataset not found: {self.dataset_id}")
        if response.status_code >= 400:
            raise RuntimeError(f"CWA request failed: HTTP {response.status_code} {response.text[:300]}")

        try:
            return response.json(), elapsed_ms
        except ValueError as exc:
            raise RuntimeError(f"CWA response is not JSON: {response.text[:300]}") from exc
