-- Add qty and unit support to meal_ingredients
-- This allows eggs (1 egg), olive oil (1 tbsp), rice (150 g), etc.

ALTER TABLE meal_ingredients
ADD COLUMN IF NOT EXISTS default_qty double precision DEFAULT 1,
ADD COLUMN IF NOT EXISTS default_unit text DEFAULT 'unit';

-- Examples of how to use:
-- INSERT INTO meal_ingredients (name, default_qty, default_unit, calories_kcal, protein_g, carbs_g, fats_g)
-- VALUES 
--   ('Eggs', 1, 'egg', 78, 6, 0.6, 5.5),
--   ('Olive Oil', 1, 'tbsp', 119, 0, 0, 13.5),
--   ('Brown Rice', 150, 'g', 195, 4.5, 43, 1.5),
--   ('Chicken Breast', 100, 'g', 165, 31, 0, 3.6),
--   ('Broccoli', 100, 'g', 34, 2.8, 7, 0.4);

-- Then in meal_templates ingredients_json, reference with overridable qty:
-- ingredients_json: [
--   { "ingredientId": 1, "qty": 2, "unit": "egg" },  -- 2 eggs instead of default 1
--   { "ingredientId": 2, "qty": 0.5, "unit": "tbsp" }, -- half tbsp of oil
--   { "ingredientId": 3 }  -- use default 150g
-- ]
