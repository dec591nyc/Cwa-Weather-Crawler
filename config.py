from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    cwa_api_key: str = os.getenv("CWA_API_KEY", "")
    cwa_dataset_id: str = os.getenv("CWA_DATASET_ID", "F-D0047-093")
    cwa_observation_dataset_id: str = os.getenv("CWA_OBSERVATION_DATASET_ID", "O-A0003-001")
    cwa_auto_station_dataset_id: str = os.getenv("CWA_AUTO_STATION_DATASET_ID", "O-A0001-001")
    cwa_rainfall_dataset_id: str = os.getenv("CWA_RAINFALL_DATASET_ID", "O-A0002-001")
    cwa_sunrise_dataset_id: str = os.getenv("CWA_SUNRISE_DATASET_ID", "A-B0062-001")
    cwa_warning_dataset_id: str = os.getenv("CWA_WARNING_DATASET_ID", "W-C0033-001")
    cwa_warning_area_dataset_id: str = os.getenv("CWA_WARNING_AREA_DATASET_ID", "W-C0033-006")
    cwa_earthquake_report_dataset_id: str = os.getenv("CWA_EARTHQUAKE_REPORT_DATASET_ID", "E-A0015-001")
    cwa_earthquake_intensity_dataset_id: str = os.getenv("CWA_EARTHQUAKE_INTENSITY_DATASET_ID", "E-A0016-001")
    moenv_api_key: str = os.getenv("MOENV_API_KEY", "")
    moenv_pm25_dataset_id: str = os.getenv("MOENV_PM25_DATASET_ID", "aqx_p_432")
    database_path: str = os.getenv("DATABASE_PATH", "data/weather.db")
    raw_data_dir: str = os.getenv("RAW_DATA_DIR", "data/raw")


settings = Settings()
