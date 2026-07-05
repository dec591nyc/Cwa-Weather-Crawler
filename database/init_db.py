from pathlib import Path
import sqlite3

from database.connection import get_connection
from config import settings


SCHEMA_MIGRATIONS = {
    "weather_observations": {
        "rainfall_1h": "REAL",
        "rainfall_today": "REAL",
        "visibility_km": "REAL",
        "visibility_description": "TEXT",
    },
    "air_quality_observations": {
        "aqi": "REAL",
        "status": "TEXT",
        "pollutant": "TEXT",
        "pm10": "REAL",
        "pm10_avg": "REAL",
        "so2": "REAL",
        "co": "REAL",
        "co_8hr": "REAL",
        "o3": "REAL",
        "o3_8hr": "REAL",
        "no2": "REAL",
        "nox": "REAL",
        "no": "REAL",
    },
}


def _column_exists(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    if table_name not in SCHEMA_MIGRATIONS:
        return True
    rows = conn.execute("PRAGMA table_info(" + table_name + ")").fetchall()
    return any(row[1] == column_name for row in rows)


def _apply_schema_migrations(conn: sqlite3.Connection) -> None:
    for table_name, columns in SCHEMA_MIGRATIONS.items():
        for column_name, column_type in columns.items():
            if _column_exists(conn, table_name, column_name):
                continue
            conn.execute("ALTER TABLE " + table_name + " ADD COLUMN " + column_name + " " + column_type)


def init_db() -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    with get_connection(settings.database_path) as conn:
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        _apply_schema_migrations(conn)


if __name__ == "__main__":
    init_db()
    print("Initialized database: " + settings.database_path)
