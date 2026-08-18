-- 016: Weekly recommendation snapshots for approve/dismiss history

BEGIN;

CREATE TABLE IF NOT EXISTS weekly_recommendation_snapshots (
  id               SERIAL PRIMARY KEY,
  user_id          integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  week_start       timestamptz NOT NULL,
  target_week_start timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  snapshot_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wrs_user_week ON weekly_recommendation_snapshots(user_id, week_start DESC);

COMMIT;
