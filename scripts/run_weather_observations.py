import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.init_db import init_db
from data_pipeline.service import sync_weather_observations


if __name__ == "__main__":
    init_db()
    count = sync_weather_observations()
    print(f"Saved {count} weather observation records into weather.db")
