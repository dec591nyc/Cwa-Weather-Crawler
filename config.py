from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    cwa_api_key: str = os.getenv("CWA_API_KEY", "")
    cwa_dataset_id: str = os.getenv("CWA_DATASET_ID", "F-D0047-091")
    cwa_observation_dataset_id: str = os.getenv("CWA_OBSERVATION_DATASET_ID", "O-A0003-001")
    moenv_api_key: str = os.getenv("MOENV_API_KEY", "")
    moenv_pm25_dataset_id: str = os.getenv("MOENV_PM25_DATASET_ID", "aqx_p_432")
    database_path: str = os.getenv("DATABASE_PATH", "data/weather.db")
    raw_data_dir: str = os.getenv("RAW_DATA_DIR", "data/raw")

settings = Settings()
