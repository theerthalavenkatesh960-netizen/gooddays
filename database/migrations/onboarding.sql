-- ─── User Onboarding Table ──────────────────────────────────────────────────
-- Stores responses from the 4-step onboarding flow completed on first signup.
-- Linked 1:1 per user. completed_at is null until all steps are done.

CREATE TABLE IF NOT EXISTS user_onboarding (
  id                    SERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Step 1: feature selection
  selected_features     TEXT[]    DEFAULT '{}',

  -- Step 2: body profile
  height_cm             INTEGER,
  current_weight_kg     DECIMAL(5, 1),
  target_weight_kg      DECIMAL(5, 1),
  target_date           DATE,
  age                   INTEGER,
  gender                TEXT,

  -- Step 3: health preferences
  daily_calories_target INTEGER,
  budget_per_week       INTEGER,
  activity_level        TEXT,
  diet_preference       TEXT,

  -- Step 4: fitness & meal preferences
  preferred_workouts    TEXT[]    DEFAULT '{}',
  workouts_per_week     INTEGER,
  minutes_per_session   INTEGER,
  preferred_meals       TEXT[]    DEFAULT '{}',

  -- Meta
  completed_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON user_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();
