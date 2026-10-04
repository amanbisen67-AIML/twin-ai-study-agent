import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    app_name: str = "Twin - Digital Twin AI Study Agent"
    version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    
    # Database
    db_path: Path = BASE_DIR / "twin_study.db"
    database_url: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    
    # Default Student ID for single-tenant / prototype mode
    default_student_id: str = os.getenv("DEFAULT_STUDENT_ID", "student_alex_chen")
    
    # LLM Configuration
    llm_provider: str = os.getenv("LLM_PROVIDER", "gemini") # "gemini", "openai", "fallback"
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Recency decay half-life in days
    half_life_days: float = float(os.getenv("HALF_LIFE_DAYS", "7.0"))
    
    # Port / Host
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

settings = Settings()
