import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.init_db import init_db
from crawler.service import run_weather_observation_crawler


if __name__ == "__main__":
    init_db()
    count = run_weather_observation_crawler()
    print(f"Saved {count} weather observation records into weather.db")
