import os
from dotenv import load_dotenv

load_dotenv()


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class Settings:
    SEOUL_API_KEY: str = get_required_env("SEOUL_API_KEY")
    DATABASE_URL: str = get_required_env("DATABASE_URL")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))


settings = Settings()
