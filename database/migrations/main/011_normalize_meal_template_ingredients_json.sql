-- Normalize meal_templates.ingredients_json to the new format:
-- [{ "ingredientId": int, "name": string, "qty": number, "unit": string }]
--
-- Supports legacy entries shaped like:
-- [{ "id": 4, "name": "Egg Whole", "qty": 150, "baseUnit": "g", ... }]
-- and attempts name-based lookup when ID is missing.

WITH normalized AS (
  SELECT
    mt.id AS meal_template_id,
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'ingredientId',
            COALESCE(
              CASE WHEN (e->>'ingredientId') ~ '^[0-9]+$' THEN (e->>'ingredientId')::int END,
              CASE WHEN (e->>'id') ~ '^[0-9]+$' THEN (e->>'id')::int END,
              mi_by_name.id
            ),
          'name', COALESCE(NULLIF(e->>'name', ''), mi_by_id.name, mi_by_name.name),
          'qty', COALESCE(
            CASE WHEN (e->>'qty') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e->>'qty')::numeric END,
            1
          ),
          'unit', COALESCE(NULLIF(e->>'unit', ''), NULLIF(e->>'baseUnit', ''), mi_by_id.default_unit, mi_by_name.default_unit, 'unit')
        )
      )
    ) AS normalized_json
  FROM meal_templates mt
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN mt.ingredients_json IS NULL OR btrim(mt.ingredients_json) = '' THEN '[]'::jsonb
      ELSE mt.ingredients_json::jsonb
    END
  ) e
  LEFT JOIN meal_ingredients mi_by_id
    ON mi_by_id.id = COALESCE(
      CASE WHEN (e->>'ingredientId') ~ '^[0-9]+$' THEN (e->>'ingredientId')::int END,
      CASE WHEN (e->>'id') ~ '^[0-9]+$' THEN (e->>'id')::int END
    )
  LEFT JOIN meal_ingredients mi_by_name
    ON lower(mi_by_name.name) = lower(COALESCE(e->>'name', ''))
  GROUP BY mt.id
)
UPDATE meal_templates mt
SET ingredients_json = normalized.normalized_json::text
FROM normalized
WHERE mt.id = normalized.meal_template_id
  AND mt.ingredients_json IS DISTINCT FROM normalized.normalized_json::text;

-- Optional verification:
-- SELECT id, name, ingredients_json FROM meal_templates ORDER BY id DESC LIMIT 20;
