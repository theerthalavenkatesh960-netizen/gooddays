-- Make meal_ingredients global/shared (remove user scope)
-- Safe for existing databases with per-user duplicate ingredient rows.

BEGIN;

-- Map every old row to a canonical row by case-insensitive ingredient name.
CREATE TEMP TABLE _meal_ingredient_canonical AS
SELECT
  id AS old_id,
  MIN(id) OVER (PARTITION BY lower(name)) AS canonical_id
FROM meal_ingredients;

-- Repoint ingredientId values in meal_templates.ingredients_json to canonical IDs.
WITH rewritten AS (
  SELECT
    mt.id AS meal_template_id,
    jsonb_agg(
      CASE
        WHEN (e->>'ingredientId') ~ '^[0-9]+$' THEN
          jsonb_set(
            e,
            '{ingredientId}',
            to_jsonb(COALESCE(m.canonical_id, (e->>'ingredientId')::int))
          )
        ELSE e
      END
    ) AS new_json
  FROM meal_templates mt
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN mt.ingredients_json IS NULL OR btrim(mt.ingredients_json) = '' THEN '[]'::jsonb
      ELSE mt.ingredients_json::jsonb
    END
  ) e
  LEFT JOIN _meal_ingredient_canonical m
    ON m.old_id = CASE
      WHEN (e->>'ingredientId') ~ '^[0-9]+$' THEN (e->>'ingredientId')::int
    END
  GROUP BY mt.id
)
UPDATE meal_templates mt
SET ingredients_json = rewritten.new_json::text
FROM rewritten
WHERE mt.id = rewritten.meal_template_id
  AND mt.ingredients_json IS DISTINCT FROM rewritten.new_json::text;

-- Delete duplicate rows (keep canonical row per lower(name)).
DELETE FROM meal_ingredients mi
USING _meal_ingredient_canonical map
WHERE mi.id = map.old_id
  AND map.old_id <> map.canonical_id;

-- Drop old user-scoped constraints/indexes and remove user_id.
DROP INDEX IF EXISTS idx_meal_ingredients_user_id;
DROP INDEX IF EXISTS ux_meal_ingredients_user_name_ci;
ALTER TABLE meal_ingredients DROP CONSTRAINT IF EXISTS meal_ingredients_user_id_fkey;
ALTER TABLE meal_ingredients DROP COLUMN IF EXISTS user_id;

-- Add global unique-name index.
CREATE UNIQUE INDEX IF NOT EXISTS ux_meal_ingredients_name_ci
  ON meal_ingredients (lower(name));

COMMIT;
