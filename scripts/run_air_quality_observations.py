import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.init_db import init_db
from data_pipeline.service import sync_pm25_observations


if __name__ == "__main__":
    init_db()
    count = sync_pm25_observations()
    print(f"Saved {count} air quality observation records into weather.db")
