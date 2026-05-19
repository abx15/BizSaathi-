from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/bizsaathi"
    REDIS_URL: str = "redis://redis:6379"
    JWT_ACCESS_SECRET: str = "change_me_access_secret_min_32_chars"
    GROQ_API_KEY: str = ""
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_COLLECTION_BUSINESS: str = "business_data"
    QDRANT_COLLECTION_INSIGHTS: str = "insights_cache"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    INTERNAL_API_KEY: str = "super_secret_internal_key"
    LOG_LEVEL: str = "info"
    MAX_CONTEXT_TOKENS: int = 4000
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_MAX_TOKENS: int = 1000
    LLM_TEMPERATURE: float = 0.3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
