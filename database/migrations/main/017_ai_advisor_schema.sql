-- ===================================================================
-- 017: AI Health Advisor — Embeddings + Feedback Tables
-- Run: psql -U postgres -d gooddays -f 017_ai_advisor_schema.sql
-- ===================================================================

BEGIN;

-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Vector Embeddings ─────────────────────────────────────────────────────────
-- Stores embedded representations of daily health records.
-- Unique per (user, record_type, date) so re-indexing is safe.

CREATE TABLE IF NOT EXISTS ai_embeddings (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  record_type   TEXT NOT NULL,                        -- 'daily_tracking' | 'weight_log' | 'workout' | 'journal'
  record_date   DATE NOT NULL,
  content_text  TEXT NOT NULL,                        -- human-readable text that was embedded
  embedding     VECTOR(384) NOT NULL,                 -- all-MiniLM-L6-v2 output
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, record_type, record_date)
);

-- IVFFlat index for fast approximate nearest-neighbour search
-- Use cosine distance (<=>) which matches 1 - cosine similarity retrieval
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_user_vector
  ON ai_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_user_type_date
  ON ai_embeddings (user_id, record_type, record_date DESC);

-- ── Feedback ──────────────────────────────────────────────────────────────────
-- Stores user satisfaction per assistant message.
-- Used to adapt reasoning depth and response style over time.

CREATE TABLE IF NOT EXISTS ai_advisor_feedback (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  conversation_id  TEXT NOT NULL,
  message_index    INTEGER NOT NULL,
  satisfied        BOOLEAN NOT NULL,
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_advisor_feedback_user ON ai_advisor_feedback(user_id);

COMMIT;
