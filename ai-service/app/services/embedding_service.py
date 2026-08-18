"""
Embedding Service
-----------------
Converts health data records into vector embeddings using a local
sentence-transformers model (all-MiniLM-L6-v2, runs fully offline).

Each log entry is serialised into a human-readable text representation
before embedding — this keeps semantic search intuitive.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
import logging

from sentence_transformers import SentenceTransformer
import numpy as np

from app.db.connection import get_pool
from config import settings

logger = logging.getLogger(__name__)

# Load once at import time; thread-safe for read
_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


# ── Text serialisers ──────────────────────────────────────────────────────────

def _daily_tracking_text(row: dict) -> str:
    parts = [f"Date: {row.get('date')}"]
    if row.get("sleephours") is not None:
        parts.append(f"Sleep: {row['sleephours']}h")
    if row.get("mood") is not None:
        parts.append(f"Mood: {row['mood']}/5")
    if row.get("workoutminutes"):
        parts.append(f"Workout: {row['workoutminutes']}min")
    if row.get("calories"):
        parts.append(f"Calories: {row['calories']}kcal")
    if row.get("watercups"):
        parts.append(f"Water: {row['watercups']} cups")
    if row.get("note"):
        parts.append(f"Note: {row['note']}")
    return ". ".join(parts)


def _weight_log_text(row: dict) -> str:
    text = f"Date: {row.get('date')}. Weight: {row.get('weight_kg')}kg"
    if row.get("note"):
        text += f". Note: {row['note']}"
    return text


def _workout_day_text(day: dict) -> str:
    exercises = day.get("exercises", [])
    ex_names = list({e["name"] for e in exercises})
    muscles = list({e["muscle_group"] for e in exercises if e.get("muscle_group")})
    return (
        f"Date: {day.get('date')}. "
        f"Workout: {day.get('day_label', 'Training')}. "
        f"Exercises: {', '.join(ex_names) if ex_names else 'none'}. "
        f"Muscles: {', '.join(muscles) if muscles else 'general'}. "
        f"Completed: {day.get('is_completed')}."
        + (f" Notes: {day.get('notes')}" if day.get("notes") else "")
    )


def _journal_text(row: dict) -> str:
    parts = [f"Date: {row.get('date')}"]
    if row.get("mood_tag"):
        parts.append(f"Mood: {row['mood_tag']}")
    if row.get("title"):
        parts.append(f"Title: {row['title']}")
    if row.get("body"):
        parts.append(row["body"][:400])     # cap length
    return ". ".join(parts)


# ── Core embed + store ────────────────────────────────────────────────────────

async def embed_and_store(user_id: int, record_type: str, record_date: date, text: str):
    """Compute embedding for text and upsert into ai_embeddings."""
    model = _get_model()
    vector: list[float] = model.encode(text).tolist()
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ai_embeddings (user_id, record_type, record_date, content_text, embedding)
            VALUES ($1, $2, $3, $4, $5::vector)
            ON CONFLICT (user_id, record_type, record_date)
            DO UPDATE SET content_text = EXCLUDED.content_text,
                          embedding    = EXCLUDED.embedding,
                          updated_at   = NOW()
            """,
            user_id,
            record_type,
            record_date,
            text,
            str(vector),          # pgvector accepts '[0.1,0.2,...]' string format
        )


# ── Batch indexing ────────────────────────────────────────────────────────────

async def index_user_data(user_id: int, since_days: int = 60):
    """
    Embed all recent health data for a user.
    Called on first query and refreshed nightly.
    """
    from app.db.health_data import (
        get_daily_tracking, get_weight_logs, get_workout_history, get_journal_entries,
    )

    tracking = await get_daily_tracking(user_id, days=since_days)
    weight = await get_weight_logs(user_id, days=since_days)
    workouts = await get_workout_history(user_id, days=since_days)
    journal = await get_journal_entries(user_id, days=since_days)

    for row in tracking:
        await embed_and_store(user_id, "daily_tracking", row["date"], _daily_tracking_text(row))

    for row in weight:
        await embed_and_store(user_id, "weight_log", row["date"], _weight_log_text(row))

    for day in workouts:
        await embed_and_store(user_id, "workout", date.fromisoformat(day["date"]), _workout_day_text(day))

    for row in journal:
        await embed_and_store(user_id, "journal", row["date"], _journal_text(row))

    logger.info(f"Indexed {len(tracking)+len(weight)+len(workouts)+len(journal)} records for user {user_id}")


# ── Semantic search ────────────────────────────────────────────────────────────

async def semantic_search(user_id: int, query_text: str, top_k: int = None) -> list[dict]:
    """
    Find records semantically similar to query_text for this user.
    Returns list of {record_type, record_date, content_text, similarity}.
    """
    if top_k is None:
        top_k = settings.TOP_K_RESULTS

    model = _get_model()
    q_vec = model.encode(query_text).tolist()
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT record_type, record_date, content_text,
                   1 - (embedding <=> $3::vector) AS similarity
            FROM ai_embeddings
            WHERE user_id = $1
              AND 1 - (embedding <=> $3::vector) >= $4
            ORDER BY embedding <=> $3::vector
            LIMIT $2
            """,
            user_id,
            top_k,
            str(q_vec),
            settings.VECTOR_SIMILARITY_THRESHOLD,
        )
        return [dict(r) for r in rows]
