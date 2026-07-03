import sqlite3
from pathlib import Path
from config import settings


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = Path(db_path or settings.database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn
