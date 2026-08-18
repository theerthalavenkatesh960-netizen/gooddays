from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/gooddays"

    # ── AI Provider: "local" (Ollama) or "claude" ─────────────────────────────
    AI_PROVIDER: str = "local"

    # ── Local Ollama ──────────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    # ── Claude (Anthropic) ────────────────────────────────────────────────────
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-latest"

    # ── Embedding model (local, sentence-transformers) ────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384              # all-MiniLM-L6-v2 output dimension

    # ── Retrieval ─────────────────────────────────────────────────────────────
    # Recent window: full embeddings used for semantic search
    RECENT_DAYS: int = 60
    # Similarity threshold for vector search (0-1)
    VECTOR_SIMILARITY_THRESHOLD: float = 0.3
    TOP_K_RESULTS: int = 15

    # ── Session memory ────────────────────────────────────────────────────────
    SESSION_HISTORY_TURNS: int = 6        # keep last N user+assistant turns

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",          # Vite dev
        "http://localhost:3000",
        "https://your-production-domain.com",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
