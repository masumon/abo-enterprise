from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "ABO Enterprise API"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    ADMIN_EMAIL: str = "admin@aboenterprise.com"
    ADMIN_PASSWORD: str = ""

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    WHATSAPP_NUMBER: str = "8801825007977"
    BUSINESS_EMAIL: str = "abo.enterprise@gmail.com"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@aboenterprise.com"
    SMTP_TLS: bool = True
    ADMIN_NOTIFY_EMAIL: str = ""

    # bKash gateway (optional — only needed if bKash API integration is active)
    BKASH_APP_KEY: str = ""
    BKASH_APP_SECRET: str = ""
    BKASH_USERNAME: str = ""
    BKASH_PASSWORD: str = ""
    BKASH_API_URL: str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    BKASH_CALLBACK_URL: str = ""

    # Nagad gateway (optional)
    NAGAD_MERCHANT_ID: str = ""
    NAGAD_MERCHANT_KEY: str = ""
    NAGAD_API_URL: str = "https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0"
    NAGAD_CALLBACK_URL: str = ""
    NAGAD_MERCHANT_NUMBER: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()  # type: ignore[call-arg]
