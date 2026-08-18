"""
Database connection pool — asyncpg (PostgreSQL).
Shared across all service modules via get_pool().
"""
import asyncpg
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_db():
    global _pool
    from config import settings
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    # Enable pgvector if not already
    async with _pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    logger.info("Database pool initialized")


async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        logger.info("Database pool closed")


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised. Call init_db() first.")
    return _pool
