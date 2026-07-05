from __future__ import annotations

from api.services.source_catalog import list_api_sources
from database.connection import get_connection

CORE_CATEGORIES = {"current_weather", "auto_weather_station", "rainfall", "air_quality"}


def latest_sync_status() -> dict:
    source_items = list_api_sources().get("sources", [])
    datasets = [source for source in source_items if source.get("status") == "active" and source.get("dataset_id")]
    dataset_ids = [source["dataset_id"] for source in datasets]
    logs_by_dataset: dict[str, dict] = {}
    if dataset_ids:
        placeholders = ",".join(["?"] * len(dataset_ids))
        sql = f"""
        SELECT fl.* FROM fetch_logs fl
        INNER JOIN (
            SELECT dataset_id, MAX(id) AS max_id
            FROM fetch_logs
            WHERE dataset_id IN ({placeholders})
            GROUP BY dataset_id
        ) latest ON latest.max_id = fl.id
        """
        with get_connection() as conn:
            rows = conn.execute(sql, dataset_ids).fetchall()
        logs_by_dataset = {row["dataset_id"]: dict(row) for row in rows}

    rows = []
    for source in datasets:
        dataset_id = source["dataset_id"]
        log = logs_by_dataset.get(dataset_id)
        if not log:
            status = "unknown"
            fetched_at = None
            record_count = 0
            response_ms = None
            error_message = "尚未同步"
        else:
            status = log.get("status") or "unknown"
            fetched_at = log.get("fetched_at")
            record_count = log.get("record_count") or 0
            response_ms = log.get("response_ms")
            error_message = log.get("error_message")
        rows.append(
            {
                "provider": source.get("provider"),
                "dataset_id": dataset_id,
                "title": source.get("title"),
                "category": source.get("category"),
                "status": status,
                "record_count": record_count,
                "fetched_at": fetched_at,
                "response_ms": response_ms,
                "error_message": error_message,
                "is_core": source.get("category") in CORE_CATEGORIES,
            }
        )

    failed = [row for row in rows if row["status"] == "failed"]
    unknown = [row for row in rows if row["status"] == "unknown"]
    core_rows = [row for row in rows if row["is_core"]]
    core_failed_or_unknown = [row for row in core_rows if row["status"] != "success"]
    if core_rows and len(core_failed_or_unknown) == len(core_rows):
        overall_status = "error"
        summary = "核心資料來源無法同步"
    elif failed or unknown:
        overall_status = "warning"
        summary = f"部分資料來源需檢查：{len(failed)} failed, {len(unknown)} unknown"
    else:
        overall_status = "ok"
        summary = "全部資料來源同步成功"

    return {
        "overall_status": overall_status,
        "summary": summary,
        "total": len(rows),
        "success_count": len([row for row in rows if row["status"] == "success"]),
        "failed_count": len(failed),
        "unknown_count": len(unknown),
        "sources": rows,
    }
