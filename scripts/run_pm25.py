import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.init_db import init_db
from crawler.service import run_pm25_crawler


if __name__ == "__main__":
    init_db()
    count = run_pm25_crawler()
    print(f"Saved {count} PM2.5 records into weather.db")
