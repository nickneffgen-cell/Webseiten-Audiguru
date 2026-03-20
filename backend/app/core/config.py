from pydantic_settings import BaseSettings
from typing import Optional, List
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DSGVO-Audit Pro"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@db:5432/dsgvo_audit"
    DATABASE_URL_SYNC: str = "postgresql://postgres:password@db:5432/dsgvo_audit"

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-6"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PROFESSIONAL: str = ""
    STRIPE_PRICE_ENTERPRISE: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://app.deudat.de",
    ]

    # Scanner
    SCANNER_MAX_PAGES: int = 50
    SCANNER_MAX_DEPTH: int = 3
    SCANNER_TIMEOUT_SECONDS: int = 30
    SCANNER_USER_AGENT: str = "DSGVO-Audit-Bot/1.0 (+https://deudat.de/bot)"

    # Upload / Reports
    REPORTS_DIR: str = "/app/reports"
    MAX_CONCURRENT_SCANS: int = 5

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@deudat.de"

    # Branding
    COMPANY_NAME: str = "Deudat GmbH"
    COMPANY_LOGO_URL: str = "/static/logo.png"
    PRIMARY_COLOR: str = "#92200d"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
