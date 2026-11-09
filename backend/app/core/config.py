from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "Bandhej Worker and Business Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "sqlite:///./bandhej_dev.db"

    # JWT Authentication & Security
    JWT_SECRET_KEY: str = "bandhej-super-secret-key-change-in-production-min32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 14  # 14 hours

    # Supabase Configuration
    SUPABASE_URL: str = "https://placeholder-supabase-id.supabase.co"
    SUPABASE_KEY: str = "placeholder-supabase-anon-key"
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret-min-32-chars-long"

    # Regional & Business Settings
    DEFAULT_CURRENCY: str = "INR"
    TIMEZONE: str = "Asia/Kolkata"

    # Default Manager Access Timings in IST (24-hour HH:MM format)
    DEFAULT_MANAGER_START_TIME: str = "09:00"  # 09:00 AM IST
    DEFAULT_MANAGER_END_TIME: str = "20:00"    # 08:00 PM IST

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")


settings = Settings()
