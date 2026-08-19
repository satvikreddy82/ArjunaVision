"""Settings loaded from environment variables"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://guardian:guardian@localhost:5432/arjunavision"

    # JWT
    SECRET_KEY: str = "CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ML Service
    ML_SERVICE_URL: str = "http://localhost:8001"

    # App
    APP_NAME: str = "ArjunaVision"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # SMTP (optional, simulation mode if not set)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Maps
    OVERPASS_API_URL: str = "https://overpass-api.de/api/interpreter"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
