-- ===============================================
-- UPDATED GoodDays Meal Setup Script with Units
-- Replace all instances of "5" with your user_id
-- ===============================================

-- SECTION 1: Insert Ingredients with Quantities & Units
INSERT INTO meal_ingredients (user_id, name, default_qty, default_unit, calories_kcal, protein_g, carbs_g, fats_g)
VALUES
  (5, 'Eggs', 1, 'egg', 78, 6, 0.6, 5.5),
  (5, 'Olive Oil', 1, 'tbsp', 119, 0, 0, 13.5),
  (5, 'Brown Rice', 150, 'g', 195, 4.5, 43, 1.5),
  (5, 'Chicken Breast', 100, 'g', 165, 31, 0, 3.6),
  (5, 'Broccoli', 100, 'g', 34, 2.8, 7, 0.4)
ON CONFLICT DO NOTHING;

-- SECTION 2: Meal Templates (now with qty in ingredients_json)
-- Note: ingredients_json references ingredients by ID (1-5 from above)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe)
VALUES
  (5, 'Scrambled Eggs & Toast', 'breakfast', '08:00', 
   '[
     {"ingredientId": 1, "qty": 2, "unit": "egg"},
     {"ingredientId": 2, "qty": 0.5, "unit": "tbsp"}
   ]', 
   'Scramble 2 eggs with half tbsp olive oil'),

  (5, 'Grilled Chicken with Rice', 'lunch', '12:30',
   '[
     {"ingredientId": 4, "qty": 150, "unit": "g"},
     {"ingredientId": 3, "qty": 1, "unit": "serving"},
     {"ingredientId": 5, "qty": 100, "unit": "g"}
   ]',
   '1. Grill chicken 2. Cook rice 3. Steam broccoli'),

  (5, 'Egg Fried Rice', 'dinner', '19:00',
   '[
     {"ingredientId": 3, "qty": 200, "unit": "g"},
     {"ingredientId": 1, "qty": 3, "unit": "egg"},
     {"ingredientId": 2, "qty": 1, "unit": "tbsp"}
   ]',
   'Fry rice with scrambled eggs and oil'),

  (5, 'Protein Bowl', 'lunch', '13:00',
   '[
     {"ingredientId": 4, "qty": 200, "unit": "g"},
     {"ingredientId": 5, "qty": 200, "unit": "g"},
     {"ingredientId": 2, "qty": 0.25, "unit": "tbsp"}
   ]',
   'Grill chicken, steam broccoli, drizzle oil'),

  (5, 'Egg & Veggie Breakfast', 'breakfast', '07:30',
   '[
     {"ingredientId": 1, "qty": 3, "unit": "egg"},
     {"ingredientId": 5, "qty": 50, "unit": "g"},
     {"ingredientId": 2, "qty": 1, "unit": "tbsp"}
   ]',
   'Scramble eggs with steamed broccoli')
ON CONFLICT DO NOTHING;

-- SECTION 3: Weekly Meal Plan (assign meals to days/timings)
-- Format: breakfast, lunch, dinner, snack (all per day, 7 days)
INSERT INTO weekly_meal_plans (user_id, plan_json)
VALUES (5, '[
  {
    "day": "Monday",
    "meals": [
      {"mealTemplateId": 1, "timing": "breakfast"},
      {"mealTemplateId": 2, "timing": "lunch"},
      {"mealTemplateId": 3, "timing": "dinner"}
    ]
  },
  {
    "day": "Tuesday",
    "meals": [
      {"mealTemplateId": 5, "timing": "breakfast"},
      {"mealTemplateId": 4, "timing": "lunch"},
      {"mealTemplateId": 2, "timing": "dinner"}
    ]
  },
  {
    "day": "Wednesday",
    "meals": [
      {"mealTemplateId": 1, "timing": "breakfast"},
      {"mealTemplateId": 2, "timing": "lunch"},
      {"mealTemplateId": 3, "timing": "dinner"}
    ]
  },
  {
    "day": "Thursday",
    "meals": [
      {"mealTemplateId": 5, "timing": "breakfast"},
      {"mealTemplateId": 4, "timing": "lunch"},
      {"mealTemplateId": 2, "timing": "dinner"}
    ]
  },
  {
    "day": "Friday",
    "meals": [
      {"mealTemplateId": 1, "timing": "breakfast"},
      {"mealTemplateId": 2, "timing": "lunch"},
      {"mealTemplateId": 3, "timing": "dinner"}
    ]
  },
  {
    "day": "Saturday",
    "meals": [
      {"mealTemplateId": 5, "timing": "breakfast"},
      {"mealTemplateId": 4, "timing": "lunch"},
      {"mealTemplateId": 2, "timing": "dinner"}
    ]
  },
  {
    "day": "Sunday",
    "meals": [
      {"mealTemplateId": 1, "timing": "breakfast"},
      {"mealTemplateId": 2, "timing": "lunch"},
      {"mealTemplateId": 3, "timing": "dinner"}
    ]
  }
]')
ON CONFLICT (user_id) DO UPDATE SET plan_json = EXCLUDED.plan_json;

-- SECTION 4: Global Master Meals (shared library for all users)
INSERT INTO master_meal_templates (name, timing, time_of_day, ingredients_json, recipe, image_url)
VALUES
  ('Quick Breakfast Eggs', 'breakfast', '08:00',
   '[{"ingredientId": 1, "qty": 2, "unit": "egg"}, {"ingredientId": 2, "qty": 0.5, "unit": "tbsp"}]',
   '5-minute scrambled eggs', 'https://via.placeholder.com/300?text=Eggs'),

  ('Chicken & Rice Classic', 'lunch', '12:30',
   '[{"ingredientId": 4, "qty": 150, "unit": "g"}, {"ingredientId": 3, "qty": 150, "unit": "g"}]',
   'Grilled chicken with brown rice', 'https://via.placeholder.com/300?text=Chicken+Rice'),

  ('Fried Rice', 'dinner', '19:00',
   '[{"ingredientId": 3, "qty": 200, "unit": "g"}, {"ingredientId": 1, "qty": 3, "unit": "egg"}]',
   'Stir-fryer rice with eggs and veggies', 'https://via.placeholder.com/300?text=Fried+Rice'),

  ('Power Breakfast', 'breakfast', '07:30',
   '[{"ingredientId": 1, "qty": 3, "unit": "egg"}, {"ingredientId": 5, "qty": 100, "unit": "g"}]',
   'Eggs with steamed broccoli', 'https://via.placeholder.com/300?text=Power+Breakfast'),

  ('Lean Protein Bowl', 'lunch', '13:00',
   '[{"ingredientId": 4, "qty": 200, "unit": "g"}, {"ingredientId": 5, "qty": 200, "unit": "g"}]',
   'Double chicken and broccoli', 'https://via.placeholder.com/300?text=Protein+Bowl')
ON CONFLICT DO NOTHING;

-- VERIFICATION QUERIES
-- Run these to confirm data was inserted correctly:

SELECT 'Ingredients' as check_type, COUNT(*) as count FROM meal_ingredients WHERE user_id = 5;
SELECT 'Meal Templates' as check_type, COUNT(*) as count FROM meal_templates WHERE user_id = 5;
SELECT 'Weekly Plans' as check_type, COUNT(*) as count FROM weekly_meal_plans WHERE user_id = 5;
SELECT 'Master Meals' as check_type, COUNT(*) as count FROM master_meal_templates;

-- Show ingredient details with units
SELECT name, default_qty, default_unit, calories_kcal, protein_g FROM meal_ingredients WHERE user_id = 5;

-- Show meal templates with ingredient references
SELECT name, timing, ingredients_json FROM meal_templates WHERE user_id = 5 LIMIT 1;
