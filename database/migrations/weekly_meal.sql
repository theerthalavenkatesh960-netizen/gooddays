-- =============================================================
-- WEEKLY MEAL PLAN — Venkatesh (user_id = 1)
-- Goals : Muscle gain + Hair regrowth (post-transplant) + Health
-- Schedule: 7–8 AM workout | Office by 9:30 AM
-- Juice  : Beetroot + Amla + Carrot + Lemon (daily post-workout)
-- Calories: ~2800–3400 kcal/day | Protein: 165–220 g/day
-- =============================================================

-- =============================================================
-- STEP 1 : INGREDIENTS
-- =============================================================

INSERT INTO meal_ingredients (user_id, name, calories_kcal, protein_g, carbs_g, fats_g, created_at)
SELECT v.user_id, v.name, v.calories_kcal, v.protein_g, v.carbs_g, v.fats_g, now()
FROM (VALUES
  -- Proteins
  (1, 'Chicken Breast Cooked',    165,  31.0,  0.0,  3.6),
  (1, 'Eggs Whole',               143,  13.0,  1.1, 10.0),
  (1, 'Egg Whites',                52,  11.0,  0.7,  0.2),
  (1, 'Paneer',                   265,  18.0,  3.4, 20.0),
  (1, 'Fish Rohu Cooked',         148,  26.0,  0.0,  4.5),
  (1, 'Mutton Cooked',            250,  26.0,  0.0, 16.0),
  (1, 'Prawns Cooked',            119,  24.0,  1.0,  2.0),
  (1, 'Whey Protein Powder',      120,  25.0,  3.0,  1.5),
  (1, 'Greek Yogurt',              59,  10.0,  3.6,  0.4),
  (1, 'Full Fat Milk',             61,   3.2,  4.8,  3.3),
  (1, 'Cottage Cheese Paneer',    265,  18.0,  3.4, 20.0),
  -- Carbs
  (1, 'White Rice Cooked',        130,   2.7, 28.0,  0.3),
  (1, 'Whole Wheat Roti',         120,   4.0, 22.0,  2.5),
  (1, 'Multigrain Roti',          118,   4.5, 21.0,  2.8),
  (1, 'Banana',                    89,   1.1, 23.0,  0.3),
  (1, 'Oats Rolled',              389,  17.0, 66.0,  7.0),
  (1, 'Whole Wheat Bread Slice',   69,   2.7, 12.0,  1.0),
  (1, 'Dates Dried',              277,   1.8, 75.0,  0.2),
  (1, 'Sweet Potato Cooked',       90,   2.0, 21.0,  0.1),
  (1, 'Poha Flattened Rice',      350,   6.0, 77.0,  1.0),
  (1, 'Aloo Potato Cooked',        87,   1.9, 20.0,  0.1),
  -- Legumes / Dals
  (1, 'Moong Dal Cooked',         105,   7.0, 19.0,  0.4),
  (1, 'Masoor Dal Cooked',        116,   9.0, 20.0,  0.4),
  (1, 'Toor Dal Cooked',          116,   7.0, 21.0,  0.4),
  (1, 'Chana Dal Cooked',         164,   8.0, 27.0,  2.7),
  (1, 'Rajma Cooked',             127,   8.7, 22.0,  0.5),
  (1, 'Moong Sprouts Raw',         30,   3.0,  5.8,  0.2),
  (1, 'Roasted Chana',            364,  22.0, 55.0,  7.0),
  (1, 'Chickpeas Boiled',         164,   9.0, 27.0,  2.6),
  (1, 'Besan Flour',              341,  22.0, 56.0,  6.0),
  (1, 'Moong Dal Flour',          357,  24.0, 57.0,  1.2),
  -- Fats / Nuts / Seeds
  (1, 'Almonds',                  579,  21.0, 22.0, 50.0),
  (1, 'Walnuts',                  654,  15.0, 14.0, 65.0),
  (1, 'Pumpkin Seeds',            559,  30.0, 11.0, 49.0),
  (1, 'Sunflower Seeds',          584,  21.0, 20.0, 51.0),
  (1, 'Peanut Butter',            588,  25.0, 20.0, 50.0),
  (1, 'Ghee',                     900,   0.0,  0.0, 100.0),
  (1, 'Coconut Chutney',          190,   2.0,  8.0, 17.0),
  -- Vegetables
  (1, 'Spinach Palak',             23,   2.9,  3.6,  0.4),
  (1, 'Methi Fenugreek Leaves',    49,   4.4,  6.0,  0.9),
  (1, 'Tomato',                    18,   0.9,  3.9,  0.2),
  (1, 'Onion',                     40,   1.1,  9.3,  0.1),
  (1, 'Cucumber',                  15,   0.7,  3.6,  0.1),
  -- Juice ingredients
  (1, 'Beetroot Raw',              43,   1.6,  9.6,  0.2),
  (1, 'Amla Indian Gooseberry',    44,   0.9, 10.0,  0.6),
  (1, 'Carrot Raw',                41,   0.9,  9.6,  0.2),
  (1, 'Lemon Juice',               29,   1.1,  9.3,  0.3),
  -- Misc
  (1, 'Turmeric Powder',          312,   9.7, 68.0,  3.3),
  (1, 'Creatine Monohydrate',       0,   0.0,  0.0,  0.0),
  (1, 'Magnesium Glycinate',        0,   0.0,  0.0,  0.0),
  (1, 'Ashwagandha KSM66',          0,   0.0,  0.0,  0.0),
  (1, 'Raita Curd Cucumber',       62,   3.1,  4.8,  3.2)
) AS v(user_id, name, calories_kcal, protein_g, carbs_g, fats_g)
WHERE NOT EXISTS (
  SELECT 1 FROM meal_ingredients
  WHERE user_id = v.user_id
    AND lower(name) = lower(v.name)
);

-- =============================================================
-- STEP 2 : MEAL TEMPLATES
-- Timing labels used: pre-workout | post-workout | breakfast |
--                     snack | lunch | dinner |
--                     before-bed
-- =============================================================

-- -----------------------------------------------
-- SHARED DAILY MEALS (used across multiple days)
-- -----------------------------------------------

-- T-01 : Pre-workout — Banana + Dates + Almonds (Mon/Thu pattern)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Pre-Workout: Banana + Dates + Almonds',
  'pre-workout', '06:30',
  '[
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Dates Dried","qty":32,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":0.6,"carbsG":24,"fatsG":0.1},
    {"name":"Almonds","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":58,"proteinG":2.1,"carbsG":2.2,"fatsG":5.0}
  ]',
  'Soak almonds overnight. Eat banana + dates + almonds 30 min before gym. Fast carbs only — no heavy food before 7 AM session.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Pre-Workout: Banana + Dates + Almonds'));

-- T-02 : Pre-workout — Bread + Peanut Butter + Banana (Tue/Sat pattern)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Pre-Workout: Bread + Peanut Butter + Banana',
  'pre-workout', '06:30',
  '[
    {"name":"Whole Wheat Bread Slice","qty":70,"baseQty":100,"baseUnit":"g","caloriesKcal":48,"proteinG":1.9,"carbsG":8.4,"fatsG":0.7},
    {"name":"Peanut Butter","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":88,"proteinG":3.8,"carbsG":3.0,"fatsG":7.5},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}
  ]',
  'Spread PB on bread. Eat with banana. Provides sustained carbs + fats for 60-min pull sessions.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Pre-Workout: Bread + Peanut Butter + Banana'));

-- T-03 : Pre-workout — 3 Bananas + Dates (Wed — legs day, highest carbs)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Pre-Workout: Triple Banana + Dates (Legs Day)',
  'pre-workout', '06:30',
  '[
    {"name":"Banana","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":267,"proteinG":3.3,"carbsG":69,"fatsG":0.9},
    {"name":"Dates Dried","qty":40,"baseQty":100,"baseUnit":"g","caloriesKcal":111,"proteinG":0.7,"carbsG":30,"fatsG":0.1}
  ]',
  'Legs day requires maximum glycogen. Eat 3 bananas + 4-5 dates 30 min before. No fats — faster gastric emptying.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Pre-Workout: Triple Banana + Dates (Legs Day)'));

-- T-04 : Pre-workout — Overnight Oats + Banana (Fri pattern)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Pre-Workout: Overnight Oats + Banana',
  'pre-workout', '06:30',
  '[
    {"name":"Oats Rolled","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":195,"proteinG":8.5,"carbsG":33,"fatsG":3.5},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}
  ]',
  'Soak oats in 200ml water the night before. Eat cold with banana at 6:30 AM. Sustained slow carbs — good for longer push sessions.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Pre-Workout: Overnight Oats + Banana'));

-- T-05 : Post-workout shake + Beetroot juice (training days — standard)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Post-Workout: Whey Shake + Beetroot Amla Juice',
  'post-workout', '08:05',
  '[
    {"name":"Whey Protein Powder","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":36,"proteinG":25,"carbsG":3,"fatsG":0.5},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Beetroot Raw","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":43,"proteinG":1.6,"carbsG":9.6,"fatsG":0.2},
    {"name":"Amla Indian Gooseberry","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":13,"proteinG":0.3,"carbsG":3,"fatsG":0.2},
    {"name":"Carrot Raw","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":33,"proteinG":0.7,"carbsG":7.7,"fatsG":0.2},
    {"name":"Lemon Juice","qty":15,"baseQty":100,"baseUnit":"ml","caloriesKcal":4,"proteinG":0.2,"carbsG":1.4,"fatsG":0.0}
  ]',
  'WHEY: Mix 1 scoop in 300ml milk, drink immediately post-workout. JUICE: Blend beetroot + amla + carrot raw with 100ml water. Squeeze lemon after blending (not during — heat degrades vitamin C). Drink within 20 min of blending. Do NOT add sugar or salt. Beetroot urine (pink) is normal.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Post-Workout: Whey Shake + Beetroot Amla Juice'));

-- T-06 : Beetroot juice only (rest days — Thu/Sun)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Morning Juice: Beetroot Amla Carrot Lemon',
  'post-workout', '08:00',
  '[
    {"name":"Beetroot Raw","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":43,"proteinG":1.6,"carbsG":9.6,"fatsG":0.2},
    {"name":"Amla Indian Gooseberry","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":13,"proteinG":0.3,"carbsG":3,"fatsG":0.2},
    {"name":"Carrot Raw","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":33,"proteinG":0.7,"carbsG":7.7,"fatsG":0.2},
    {"name":"Lemon Juice","qty":15,"baseQty":100,"baseUnit":"ml","caloriesKcal":4,"proteinG":0.2,"carbsG":1.4,"fatsG":0.0}
  ]',
  'Blend beetroot + amla + carrot with minimal water. Squeeze lemon after blending. Drink within 20 min. ~110 kcal, 80mg vitamin C, 1.8mg iron. Take after soaked nuts on rest days (not fully empty stomach — beet is acidic).',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Morning Juice: Beetroot Amla Carrot Lemon'));

-- -----------------------------------------------
-- BREAKFAST TEMPLATES
-- -----------------------------------------------

-- T-07 : Breakfast Mon — Eggs + Roti + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Scrambled Eggs + Roti + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Eggs Whole","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":286,"proteinG":26,"carbsG":2.2,"fatsG":20},
    {"name":"Spinach Palak","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":12,"proteinG":1.5,"carbsG":1.8,"fatsG":0.2},
    {"name":"Onion","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":12,"proteinG":0.3,"carbsG":2.8,"fatsG":0.0},
    {"name":"Multigrain Roti","qty":120,"baseQty":100,"baseUnit":"g","caloriesKcal":142,"proteinG":5.4,"carbsG":25.2,"fatsG":3.4},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9}
  ]',
  'Scramble 4 eggs with spinach, onion, tomato. Serve with 2 multigrain rotis. Drink 300ml milk alongside. ~42g protein. Must finish before 9:15 AM to leave for office.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Scrambled Eggs + Roti + Milk'));

-- T-08 : Breakfast Tue — Oats Upma + Egg Omelette + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Oats Upma + Egg Omelette + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311,"proteinG":13.6,"carbsG":52.8,"fatsG":5.6},
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Egg Whites","qty":90,"baseQty":100,"baseUnit":"g","caloriesKcal":47,"proteinG":9.9,"carbsG":0.6,"fatsG":0.2},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9}
  ]',
  'Cook oats as upma with peas, carrots, curry leaves, mustard. Make omelette with 3 egg whites + 2 whole eggs. Drink milk with 1 orange (orange not in macros but take for vitamin C). ~38g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Oats Upma + Egg Omelette + Milk'));

-- T-09 : Breakfast Wed — Besan Chilla + Yogurt + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Besan Chilla + Greek Yogurt + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Besan Flour","qty":90,"baseQty":100,"baseUnit":"g","caloriesKcal":307,"proteinG":19.8,"carbsG":50.4,"fatsG":5.4},
    {"name":"Greek Yogurt","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":15,"carbsG":5.4,"fatsG":0.6},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Dates Dried","qty":24,"baseQty":100,"baseUnit":"g","caloriesKcal":66,"proteinG":0.4,"carbsG":18,"fatsG":0.0}
  ]',
  'Mix besan with water, onion, green chilli, coriander. Make 3 medium chillas. Serve with Greek yogurt. Drink milk. Add banana + 4 dates for extra carbs on leg day. ~40g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Besan Chilla + Greek Yogurt + Milk'));

-- T-10 : Breakfast Thu — Poha + Eggs + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Poha + Boiled Eggs + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Poha Flattened Rice","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":350,"proteinG":6,"carbsG":77,"fatsG":1},
    {"name":"Roasted Chana","qty":20,"baseQty":100,"baseUnit":"g","caloriesKcal":73,"proteinG":4.4,"carbsG":11,"fatsG":1.4},
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9}
  ]',
  'Cook poha with peanuts, curry leaves, mustard seeds, onion. Serve with 2 boiled eggs. Drink milk + 1 orange separately. Rest day so lighter carbs. ~30g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Poha + Boiled Eggs + Milk'));

-- T-11 : Breakfast Fri — Moong Dal Chilla + Egg Omelette + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Moong Dal Chilla + Egg Omelette + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Moong Dal Flour","qty":90,"baseQty":100,"baseUnit":"g","caloriesKcal":321,"proteinG":21.6,"carbsG":51.3,"fatsG":1.1},
    {"name":"Eggs Whole","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":286,"proteinG":26,"carbsG":2.2,"fatsG":20},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}
  ]',
  'Soak moong dal overnight or use moong dal flour. Make 3 chillas. 4-egg omelette with onion + tomato. Drink milk + banana. ~44g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Moong Dal Chilla + Egg Omelette + Milk'));

-- T-12 : Breakfast Sat — Pesarattu + Eggs + Sambar + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Pesarattu + Eggs + Sambar + Milk',
  'breakfast', '08:30',
  '[
    {"name":"Moong Dal Flour","qty":90,"baseQty":100,"baseUnit":"g","caloriesKcal":321,"proteinG":21.6,"carbsG":51.3,"fatsG":1.1},
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Moong Dal Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":158,"proteinG":10.5,"carbsG":28.5,"fatsG":0.6},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}
  ]',
  'Green moong dosa (pesarattu) — 3 pieces with sambar. 2 eggs fried/boiled alongside. Drink milk + banana. High-protein South Indian. ~42g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Pesarattu + Eggs + Sambar + Milk'));

-- T-13 : Breakfast Sun — Aloo Paratha + Egg Omelette + Curd + Milk
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Breakfast: Aloo Paratha + Egg Omelette + Curd + Milk',
  'breakfast', '09:00',
  '[
    {"name":"Aloo Potato Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":131,"proteinG":2.9,"carbsG":30,"fatsG":0.2},
    {"name":"Whole Wheat Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":216,"proteinG":7.2,"carbsG":39.6,"fatsG":4.5},
    {"name":"Ghee","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":90,"proteinG":0,"carbsG":0,"fatsG":10},
    {"name":"Eggs Whole","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":286,"proteinG":26,"carbsG":2.2,"fatsG":20},
    {"name":"Greek Yogurt","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":118,"proteinG":20,"carbsG":7.2,"fatsG":0.8},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9}
  ]',
  'Sunday comfort breakfast. 2 big aloo parathas with ghee. 4-egg omelette. 1 cup dahi + 1 glass milk. No rush — enjoy it. ~42g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Breakfast: Aloo Paratha + Egg Omelette + Curd + Milk'));

-- -----------------------------------------------
-- OFFICE SNACK TEMPLATES (Morning — 11:00 AM)
-- -----------------------------------------------

-- T-14 : Snack — Greek Yogurt + Seeds + Apple (Mon/Fri)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Office Snack: Greek Yogurt + Seeds + Apple',
  'snack', '11:00',
  '[
    {"name":"Greek Yogurt","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":118,"proteinG":20,"carbsG":7.2,"fatsG":0.8},
    {"name":"Pumpkin Seeds","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":84,"proteinG":4.5,"carbsG":1.7,"fatsG":7.4},
    {"name":"Sunflower Seeds","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":58,"proteinG":2.1,"carbsG":2.0,"fatsG":5.1}
  ]',
  'Pack in small container night before. No refrigeration needed for 2-3 hours. Eat apple separately. Seeds provide zinc + biotin for hair. ~22g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Office Snack: Greek Yogurt + Seeds + Apple'));

-- T-15 : Snack — Boiled Eggs + Banana + Mixed Nuts (Tue/Thu)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Office Snack: Boiled Eggs + Banana + Mixed Nuts',
  'snack', '11:00',
  '[
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Almonds","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":87,"proteinG":3.2,"carbsG":3.3,"fatsG":7.5},
    {"name":"Walnuts","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":65,"proteinG":1.5,"carbsG":1.4,"fatsG":6.5}
  ]',
  'Boil 2 eggs night before, store in fridge. Pack with banana + nuts in a small box. No fridge needed at office. Walnuts = omega-3 for hair. ~16g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Office Snack: Boiled Eggs + Banana + Mixed Nuts'));

-- T-16 : Snack — Moong Sprouts Chaat + Boiled Egg (Wed/Sat)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Office Snack: Sprouts Chaat + Boiled Egg + Guava',
  'snack', '11:00',
  '[
    {"name":"Moong Sprouts Raw","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":30,"proteinG":3,"carbsG":5.8,"fatsG":0.2},
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Onion","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":12,"proteinG":0.3,"carbsG":2.8,"fatsG":0.0},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Soak moong overnight, sprout for 1-2 days. Mix with onion, lemon, chaat masala. Pack in dabba with boiled egg. Guava eaten fresh. Iron + zinc hit. ~22g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Office Snack: Sprouts Chaat + Boiled Egg + Guava'));

-- T-17 : Snack — Roasted Chana + Banana + Walnuts (Mon/Thu/rest)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Office Snack: Roasted Chana + Banana + Walnuts',
  'snack', '11:00',
  '[
    {"name":"Roasted Chana","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":182,"proteinG":11,"carbsG":27.5,"fatsG":3.5},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Walnuts","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":98,"proteinG":2.3,"carbsG":2.1,"fatsG":9.8}
  ]',
  'Pack roasted chana in small pouch. Carry banana separately. Eat walnuts for omega-3 (hair). Easy no-prep office snack. ~14g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Office Snack: Roasted Chana + Banana + Walnuts'));

-- -----------------------------------------------
-- LUNCH TEMPLATES
-- -----------------------------------------------

-- T-18 : Lunch Mon — Chicken + Rice + Moong Dal + Palak
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Chicken + Rice + Moong Dal + Palak Sabzi',
  'lunch', '13:30',
  '[
    {"name":"Chicken Breast Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":248,"proteinG":46.5,"carbsG":0,"fatsG":5.4},
    {"name":"White Rice Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":325,"proteinG":6.8,"carbsG":70,"fatsG":0.8},
    {"name":"Moong Dal Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":158,"proteinG":10.5,"carbsG":28.5,"fatsG":0.6},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Chicken as curry or grilled. Squeeze lemon on dal — vitamin C triples iron absorption from palak + dal. Always have salad (cucumber, tomato, onion) alongside. ~48g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Chicken + Rice + Moong Dal + Palak Sabzi'));

-- T-19 : Lunch Tue — Fish + Rice + Masoor Dal
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Fish + Rice + Masoor Dal',
  'lunch', '13:30',
  '[
    {"name":"Fish Rohu Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":222,"proteinG":39,"carbsG":0,"fatsG":6.8},
    {"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},
    {"name":"Masoor Dal Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":174,"proteinG":13.5,"carbsG":30,"fatsG":0.6},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Fish curry (rohu/surmai/salmon). Masoor dal is highest iron lentil. Squeeze lemon on dal. Eat raita on side. Omega-3 from fish supports hair follicles + scalp. ~46g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Fish + Rice + Masoor Dal'));

-- T-20 : Lunch Wed — Mutton/Chicken + Rice + Rajma (Legs day high-carb)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Mutton + Rice + Rajma (Legs Day)',
  'lunch', '13:30',
  '[
    {"name":"Mutton Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":375,"proteinG":39,"carbsG":0,"fatsG":24},
    {"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},
    {"name":"Rajma Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":191,"proteinG":13.1,"carbsG":33,"fatsG":0.8},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Highest iron + zinc lunch of the week. Mutton has best bioavailable iron (heme iron). Rajma adds plant iron + fiber. Legs need glycogen replenishment. ~50g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Mutton + Rice + Rajma (Legs Day)'));

-- T-21 : Lunch Thu — Fish/Chicken + Rice + Sambar (rest day lighter)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Fish + Rice + Sambar (Rest Day)',
  'lunch', '13:30',
  '[
    {"name":"Fish Rohu Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":222,"proteinG":39,"carbsG":0,"fatsG":6.8},
    {"name":"White Rice Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":260,"proteinG":5.4,"carbsG":56,"fatsG":0.6},
    {"name":"Whole Wheat Roti","qty":60,"baseQty":100,"baseUnit":"g","caloriesKcal":72,"proteinG":2.4,"carbsG":13.2,"fatsG":1.5},
    {"name":"Toor Dal Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":174,"proteinG":10.5,"carbsG":31.5,"fatsG":0.6},
    {"name":"Coconut Chutney","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":57,"proteinG":0.6,"carbsG":2.4,"fatsG":5.1}
  ]',
  'South Indian style — sambar (toor dal + vegetables) with rice + 1 roti. Coconut chutney for healthy fats. Rest day so slightly lower carbs. ~44g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Fish + Rice + Sambar (Rest Day)'));

-- T-22 : Lunch Fri — Chicken + Rice + Toor Dal + Methi
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Chicken + Rice + Toor Dal + Methi Sabzi',
  'lunch', '13:30',
  '[
    {"name":"Chicken Breast Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":248,"proteinG":46.5,"carbsG":0,"fatsG":5.4},
    {"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},
    {"name":"Toor Dal Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":174,"proteinG":10.5,"carbsG":31.5,"fatsG":0.6},
    {"name":"Methi Fenugreek Leaves","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":49,"proteinG":4.4,"carbsG":6,"fatsG":0.9},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Methi sabzi is specifically hair-boosting — iron + fenugreek seeds are classic Ayurvedic hair treatment. Squeeze lemon on dal. ~46g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Chicken + Rice + Toor Dal + Methi Sabzi'));

-- T-23 : Lunch Sat — Mutton/Prawn + Rice + Kadhi + Methi
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Mutton + Rice + Kadhi + Methi Sabzi',
  'lunch', '13:30',
  '[
    {"name":"Mutton Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":375,"proteinG":39,"carbsG":0,"fatsG":24},
    {"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},
    {"name":"Greek Yogurt","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":59,"proteinG":10,"carbsG":3.6,"fatsG":0.4},
    {"name":"Methi Fenugreek Leaves","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":49,"proteinG":4.4,"carbsG":6,"fatsG":0.9},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Highest iron day of the week. Kadhi (yogurt-besan curry) is probiotic. Methi double iron hit. Best bioavailable iron meal of the plan. ~46g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Mutton + Rice + Kadhi + Methi Sabzi'));

-- T-24 : Lunch Sun — Biryani + Raita + Dal
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Lunch: Home Biryani + Raita + Dal (Sunday)',
  'lunch', '13:30',
  '[
    {"name":"Chicken Breast Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":248,"proteinG":46.5,"carbsG":0,"fatsG":5.4},
    {"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},
    {"name":"Raita Curd Cucumber","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":124,"proteinG":6.2,"carbsG":9.6,"fatsG":6.4},
    {"name":"Moong Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":105,"proteinG":7,"carbsG":19,"fatsG":0.4},
    {"name":"Lemon Juice","qty":10,"baseQty":100,"baseUnit":"ml","caloriesKcal":3,"proteinG":0.1,"carbsG":0.9,"fatsG":0.0}
  ]',
  'Home-cooked chicken biryani. Raita + salad alongside. Dal for extra iron. Sunday meal should be enjoyed — no stress. ~46g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Lunch: Home Biryani + Raita + Dal (Sunday)'));

-- -----------------------------------------------
-- EVENING SNACK TEMPLATES (4:30 PM)
-- -----------------------------------------------

-- T-25 : Evening — Roasted Chana + Banana + Walnuts
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Evening Snack: Roasted Chana + Banana + Walnuts',
  'snack', '16:30',
  '[
    {"name":"Roasted Chana","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":182,"proteinG":11,"carbsG":27.5,"fatsG":3.5},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Walnuts","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":98,"proteinG":2.3,"carbsG":2.1,"fatsG":9.8}
  ]',
  'Keep roasted chana in office drawer. Carry banana. Walnuts are critical — omega-3 is the most lacking fatty acid for hair health in Indian diets. ~14g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Evening Snack: Roasted Chana + Banana + Walnuts'));

-- T-26 : Evening — Peanut Butter Bread + Banana
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Evening Snack: Peanut Butter Bread + Banana',
  'snack', '16:30',
  '[
    {"name":"Whole Wheat Bread Slice","qty":70,"baseQty":100,"baseUnit":"g","caloriesKcal":48,"proteinG":1.9,"carbsG":8.4,"fatsG":0.7},
    {"name":"Peanut Butter","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":176,"proteinG":7.5,"carbsG":6,"fatsG":15},
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}
  ]',
  '2 bread slices + 2 tbsp PB + banana. Quick to assemble. Good fat + carb combo for afternoon energy without post-workout spike needed. ~10g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Evening Snack: Peanut Butter Bread + Banana'));

-- T-27 : Evening — Sweet Potato + Boiled Eggs + Milk (Wed/Sun)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Evening Snack: Roasted Sweet Potato + Boiled Eggs + Milk',
  'snack', '16:30',
  '[
    {"name":"Sweet Potato Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":4,"carbsG":42,"fatsG":0.2},
    {"name":"Eggs Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":143,"proteinG":13,"carbsG":1.1,"fatsG":10},
    {"name":"Full Fat Milk","qty":200,"baseQty":100,"baseUnit":"ml","caloriesKcal":122,"proteinG":6.4,"carbsG":9.6,"fatsG":6.6}
  ]',
  'Roast sweet potato in air fryer or oven — no oil needed. Eat with 2 boiled eggs. Drink milk. Beta-carotene in sweet potato converts to vitamin A — regulates scalp sebum. ~22g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Evening Snack: Roasted Sweet Potato + Boiled Eggs + Milk'));

-- T-28 : Evening — Greek Yogurt + Seeds + Fruit (Thu)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Evening Snack: Greek Yogurt + Mixed Seeds + Fruit',
  'snack', '16:30',
  '[
    {"name":"Greek Yogurt","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":118,"proteinG":20,"carbsG":7.2,"fatsG":0.8},
    {"name":"Pumpkin Seeds","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":84,"proteinG":4.5,"carbsG":1.7,"fatsG":7.4},
    {"name":"Sunflower Seeds","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":58,"proteinG":2.1,"carbsG":2,"fatsG":5.1}
  ]',
  'Greek yogurt + seeds. Eat apple or pear alongside. Zinc from seeds is most critical micronutrient for hair after protein. ~18g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Evening Snack: Greek Yogurt + Mixed Seeds + Fruit'));

-- T-29 : Evening — Protein Smoothie (Sat if at home)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Evening Snack: Protein Smoothie (Banana + Whey + PB + Milk)',
  'snack', '16:30',
  '[
    {"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},
    {"name":"Whey Protein Powder","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":36,"proteinG":25,"carbsG":3,"fatsG":0.5},
    {"name":"Peanut Butter","qty":15,"baseQty":100,"baseUnit":"g","caloriesKcal":88,"proteinG":3.8,"carbsG":3,"fatsG":7.5},
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Pumpkin Seeds","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":56,"proteinG":3,"carbsG":1.1,"fatsG":4.9}
  ]',
  'Blend all ingredients. Drink as post-evening protein hit. Use only if at home (needs blender). Pumpkin seeds add zinc on top. ~30g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Evening Snack: Protein Smoothie (Banana + Whey + PB + Milk)'));

-- -----------------------------------------------
-- DINNER TEMPLATES
-- -----------------------------------------------

-- T-30 : Dinner Mon — Paneer Bhurji + Rajma + Rotis + Raita
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Paneer Bhurji + Rajma + Rotis + Raita',
  'dinner', '20:00',
  '[
    {"name":"Paneer","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":398,"proteinG":27,"carbsG":5.1,"fatsG":30},
    {"name":"Rajma Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":191,"proteinG":13.1,"carbsG":33,"fatsG":0.8},
    {"name":"Whole Wheat Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":216,"proteinG":7.2,"carbsG":39.6,"fatsG":4.5},
    {"name":"Raita Curd Cucumber","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":62,"proteinG":3.1,"carbsG":4.8,"fatsG":3.2}
  ]',
  'Paneer bhurji with onion, tomato, capsicum. Rajma curry (iron + fiber). 3 rotis. Raita for probiotics + zinc. ~40g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Paneer Bhurji + Rajma + Rotis + Raita'));

-- T-31 : Dinner Tue — Chicken Curry + Palak Dal + Rotis
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Chicken Curry + Palak Dal + Rotis',
  'dinner', '20:00',
  '[
    {"name":"Chicken Breast Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":248,"proteinG":46.5,"carbsG":0,"fatsG":5.4},
    {"name":"Masoor Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":116,"proteinG":9,"carbsG":20,"fatsG":0.4},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Multigrain Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":212,"proteinG":8.1,"carbsG":37.8,"fatsG":5.0}
  ]',
  'Chicken in light curry. Palak + dal combined (iron double hit). 3 rotis. Lemon on dal. ~44g protein, highest iron dinner.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Chicken Curry + Palak Dal + Rotis'));

-- T-32 : Dinner Wed — Eggs + Paneer + Chana Dal + Spinach + Rotis
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Egg Curry + Paneer + Chana Dal + Spinach + Rotis',
  'dinner', '20:00',
  '[
    {"name":"Eggs Whole","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":286,"proteinG":26,"carbsG":2.2,"fatsG":20},
    {"name":"Paneer","qty":75,"baseQty":100,"baseUnit":"g","caloriesKcal":199,"proteinG":13.5,"carbsG":2.6,"fatsG":15},
    {"name":"Chana Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":164,"proteinG":8,"carbsG":27,"fatsG":2.7},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Whole Wheat Roti","qty":120,"baseQty":100,"baseUnit":"g","caloriesKcal":144,"proteinG":4.8,"carbsG":26.4,"fatsG":3.0}
  ]',
  '4 eggs any style (curry/bhurji/boiled). 75g paneer on the side. Chana dal + spinach. 2 rotis (leg day dinner — reduce carbs a little). ~44g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Egg Curry + Paneer + Chana Dal + Spinach + Rotis'));

-- T-33 : Dinner Thu — Dal Makhani + Paneer Tikka + Rotis
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Dal Makhani + Paneer Tikka + Rotis',
  'dinner', '20:00',
  '[
    {"name":"Rajma Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":127,"proteinG":8.7,"carbsG":22,"fatsG":0.5},
    {"name":"Masoor Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":116,"proteinG":9,"carbsG":20,"fatsG":0.4},
    {"name":"Paneer","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":398,"proteinG":27,"carbsG":5.1,"fatsG":30},
    {"name":"Multigrain Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":212,"proteinG":8.1,"carbsG":37.8,"fatsG":5.0}
  ]',
  'Dal makhani = rajma + masoor combo slow-cooked. Paneer tikka grilled in air fryer (skip cream marinade). 3 rotis. Rest day so this is the main protein source. ~38g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Dal Makhani + Paneer Tikka + Rotis'));

-- T-34 : Dinner Fri — Egg Bhurji + Palak Paneer + Rotis + Raita
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Egg Bhurji + Palak Paneer + Rotis + Raita',
  'dinner', '20:00',
  '[
    {"name":"Eggs Whole","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":286,"proteinG":26,"carbsG":2.2,"fatsG":20},
    {"name":"Paneer","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":265,"proteinG":18,"carbsG":3.4,"fatsG":20},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Whole Wheat Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":216,"proteinG":7.2,"carbsG":39.6,"fatsG":4.5},
    {"name":"Raita Curd Cucumber","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":62,"proteinG":3.1,"carbsG":4.8,"fatsG":3.2}
  ]',
  'Egg bhurji (4 eggs with onion, tomato). Palak paneer (100g paneer + spinach). 3 rotis + raita. Best iron dinner — spinach in palak paneer with lemon on the side. ~46g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Egg Bhurji + Palak Paneer + Rotis + Raita'));

-- T-35 : Dinner Sat — Grilled Fish + Dal Palak + Rotis + Raita
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Grilled Fish + Dal Palak + Rotis + Raita',
  'dinner', '20:00',
  '[
    {"name":"Fish Rohu Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":222,"proteinG":39,"carbsG":0,"fatsG":6.8},
    {"name":"Masoor Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":116,"proteinG":9,"carbsG":20,"fatsG":0.4},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Multigrain Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":212,"proteinG":8.1,"carbsG":37.8,"fatsG":5.0},
    {"name":"Raita Curd Cucumber","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":62,"proteinG":3.1,"carbsG":4.8,"fatsG":3.2}
  ]',
  'Grilled fish (air fryer or tawa, minimal oil). Masoor dal + palak combo. 3 rotis. Raita. Omega-3 + iron + folate in one dinner. ~44g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Grilled Fish + Dal Palak + Rotis + Raita'));

-- T-36 : Dinner Sun — Paneer Curry + Sarson/Palak Dal + Rotis + Raita
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Dinner: Paneer Curry + Palak Dal + Rotis + Raita (Sunday)',
  'dinner', '20:00',
  '[
    {"name":"Paneer","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":398,"proteinG":27,"carbsG":5.1,"fatsG":30},
    {"name":"Masoor Dal Cooked","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":116,"proteinG":9,"carbsG":20,"fatsG":0.4},
    {"name":"Spinach Palak","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":23,"proteinG":2.9,"carbsG":3.6,"fatsG":0.4},
    {"name":"Whole Wheat Roti","qty":180,"baseQty":100,"baseUnit":"g","caloriesKcal":216,"proteinG":7.2,"carbsG":39.6,"fatsG":4.5},
    {"name":"Raita Curd Cucumber","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":62,"proteinG":3.1,"carbsG":4.8,"fatsG":3.2}
  ]',
  'Sunday night — light prep, good nutrition. Paneer curry (light gravy). Palak dal. 3 rotis + raita. Week ends on high protein note. ~38g protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dinner: Paneer Curry + Palak Dal + Rotis + Raita (Sunday)'));

-- -----------------------------------------------
-- BEFORE BED TEMPLATES
-- -----------------------------------------------

-- T-37 : Before bed — Warm Milk + Turmeric + Creatine + Magnesium
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Before Bed: Turmeric Milk + Creatine + Magnesium',
  'before-bed', '22:00',
  '[
    {"name":"Full Fat Milk","qty":300,"baseQty":100,"baseUnit":"ml","caloriesKcal":183,"proteinG":9.6,"carbsG":14.4,"fatsG":9.9},
    {"name":"Turmeric Powder","qty":3,"baseQty":100,"baseUnit":"g","caloriesKcal":9,"proteinG":0.3,"carbsG":2,"fatsG":0.1},
    {"name":"Creatine Monohydrate","qty":5,"baseQty":100,"baseUnit":"g","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0},
    {"name":"Magnesium Glycinate","qty":0,"baseQty":0,"baseUnit":"capsule","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0}
  ]',
  'Heat 300ml milk, add 1 tsp turmeric. Stir in 5g creatine (dissolves in warm milk). Take 1 magnesium glycinate 300mg capsule separately. Casein from milk feeds muscles 6-8 hrs overnight. ~8g slow protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Before Bed: Turmeric Milk + Creatine + Magnesium'));

-- T-38 : Before bed — Paneer + Creatine + Ashwagandha (Tue/Sat)
INSERT INTO meal_templates (user_id, name, timing, time_of_day, ingredients_json, recipe, image_url, created_at)
SELECT 1,
  'Before Bed: Paneer + Creatine + Ashwagandha',
  'before-bed', '22:00',
  '[
    {"name":"Cottage Cheese Paneer","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":265,"proteinG":18,"carbsG":3.4,"fatsG":20},
    {"name":"Creatine Monohydrate","qty":5,"baseQty":100,"baseUnit":"g","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0},
    {"name":"Ashwagandha KSM66","qty":0,"baseQty":0,"baseUnit":"capsule","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0}
  ]',
  '100g cold paneer (eat plain or with salt + pepper). 5g creatine dissolved in warm water. 1 ashwagandha KSM-66 capsule (300mg). Ashwagandha lowers cortisol overnight — less cortisol = less DHT = better hair. ~18g slow casein protein.',
  NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Before Bed: Paneer + Creatine + Ashwagandha'));

-- =============================================================
-- STEP 3 : WEEKLY MEAL PLAN
-- Map each day to the template IDs in order:
-- [pre-workout, post-workout, breakfast, snack,
--  lunch, snack, dinner, before-bed]
-- Dates below are relative week starting Mon May 13 2026
-- Update dates to current week's Monday as needed
-- =============================================================

/*
  TEMPLATE ID REFERENCE (in insertion order above):
  T-01  Pre-Workout: Banana + Dates + Almonds
  T-02  Pre-Workout: Bread + PB + Banana
  T-03  Pre-Workout: Triple Banana + Dates (Legs Day)
  T-04  Pre-Workout: Overnight Oats + Banana
  T-05  Post-Workout: Whey Shake + Beetroot Amla Juice
  T-06  Morning Juice: Beetroot Amla Carrot Lemon (rest days)
  T-07  Breakfast: Scrambled Eggs + Roti + Milk
  T-08  Breakfast: Oats Upma + Egg Omelette + Milk
  T-09  Breakfast: Besan Chilla + Greek Yogurt + Milk
  T-10  Breakfast: Poha + Boiled Eggs + Milk
  T-11  Breakfast: Moong Dal Chilla + Egg Omelette + Milk
  T-12  Breakfast: Pesarattu + Eggs + Sambar + Milk
  T-13  Breakfast: Aloo Paratha + Egg Omelette + Curd + Milk
  T-14  Office Snack: Greek Yogurt + Seeds + Apple
  T-15  Office Snack: Boiled Eggs + Banana + Mixed Nuts
  T-16  Office Snack: Sprouts Chaat + Boiled Egg + Guava
  T-17  Office Snack: Roasted Chana + Banana + Walnuts
  T-18  Lunch: Chicken + Rice + Moong Dal + Palak
  T-19  Lunch: Fish + Rice + Masoor Dal
  T-20  Lunch: Mutton + Rice + Rajma (Legs Day)
  T-21  Lunch: Fish + Rice + Sambar (Rest Day)
  T-22  Lunch: Chicken + Rice + Toor Dal + Methi
  T-23  Lunch: Mutton + Rice + Kadhi + Methi
  T-24  Lunch: Home Biryani + Raita + Dal (Sunday)
  T-25  Evening Snack: Roasted Chana + Banana + Walnuts
  T-26  Evening Snack: Peanut Butter Bread + Banana
  T-27  Evening Snack: Roasted Sweet Potato + Boiled Eggs + Milk
  T-28  Evening Snack: Greek Yogurt + Mixed Seeds + Fruit
  T-29  Evening Snack: Protein Smoothie
  T-30  Dinner: Paneer Bhurji + Rajma + Rotis + Raita
  T-31  Dinner: Chicken Curry + Palak Dal + Rotis
  T-32  Dinner: Egg Curry + Paneer + Chana Dal + Spinach + Rotis
  T-33  Dinner: Dal Makhani + Paneer Tikka + Rotis
  T-34  Dinner: Egg Bhurji + Palak Paneer + Rotis + Raita
  T-35  Dinner: Grilled Fish + Dal Palak + Rotis + Raita
  T-36  Dinner: Paneer Curry + Palak Dal + Rotis + Raita (Sunday)
  T-37  Before Bed: Turmeric Milk + Creatine + Magnesium
  T-38  Before Bed: Paneer + Creatine + Ashwagandha
*/

-- App-compatible weekly plan format:
-- plan_json is a date-keyed object and each value is an ordered array
-- of meal_templates.id for that date.
WITH meal_ids AS (
  SELECT id, name
  FROM meal_templates
  WHERE user_id = 1
), weekly_plan AS (
  SELECT jsonb_build_object(
    '2026-05-13', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Pre-Workout: Banana + Dates + Almonds'),
      (SELECT id FROM meal_ids WHERE name = 'Post-Workout: Whey Shake + Beetroot Amla Juice'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Scrambled Eggs + Roti + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Greek Yogurt + Seeds + Apple'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Chicken + Rice + Moong Dal + Palak Sabzi'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Roasted Chana + Banana + Walnuts'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Paneer Bhurji + Rajma + Rotis + Raita'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Turmeric Milk + Creatine + Magnesium')
    ),
    '2026-05-14', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Pre-Workout: Bread + Peanut Butter + Banana'),
      (SELECT id FROM meal_ids WHERE name = 'Post-Workout: Whey Shake + Beetroot Amla Juice'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Oats Upma + Egg Omelette + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Boiled Eggs + Banana + Mixed Nuts'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Fish + Rice + Masoor Dal'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Peanut Butter Bread + Banana'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Chicken Curry + Palak Dal + Rotis'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Paneer + Creatine + Ashwagandha')
    ),
    '2026-05-15', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Pre-Workout: Triple Banana + Dates (Legs Day)'),
      (SELECT id FROM meal_ids WHERE name = 'Post-Workout: Whey Shake + Beetroot Amla Juice'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Besan Chilla + Greek Yogurt + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Sprouts Chaat + Boiled Egg + Guava'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Mutton + Rice + Rajma (Legs Day)'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Roasted Sweet Potato + Boiled Eggs + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Egg Curry + Paneer + Chana Dal + Spinach + Rotis'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Turmeric Milk + Creatine + Magnesium')
    ),
    '2026-05-16', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Morning Juice: Beetroot Amla Carrot Lemon'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Poha + Boiled Eggs + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Roasted Chana + Banana + Walnuts'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Fish + Rice + Sambar (Rest Day)'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Greek Yogurt + Mixed Seeds + Fruit'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Dal Makhani + Paneer Tikka + Rotis'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Turmeric Milk + Creatine + Magnesium')
    ),
    '2026-05-17', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Pre-Workout: Overnight Oats + Banana'),
      (SELECT id FROM meal_ids WHERE name = 'Post-Workout: Whey Shake + Beetroot Amla Juice'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Moong Dal Chilla + Egg Omelette + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Greek Yogurt + Seeds + Apple'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Chicken + Rice + Toor Dal + Methi Sabzi'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Peanut Butter Bread + Banana'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Egg Bhurji + Palak Paneer + Rotis + Raita'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Turmeric Milk + Creatine + Magnesium')
    ),
    '2026-05-18', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Pre-Workout: Bread + Peanut Butter + Banana'),
      (SELECT id FROM meal_ids WHERE name = 'Post-Workout: Whey Shake + Beetroot Amla Juice'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Pesarattu + Eggs + Sambar + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Office Snack: Sprouts Chaat + Boiled Egg + Guava'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Mutton + Rice + Kadhi + Methi Sabzi'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Protein Smoothie (Banana + Whey + PB + Milk)'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Grilled Fish + Dal Palak + Rotis + Raita'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Paneer + Creatine + Ashwagandha')
    ),
    '2026-05-19', jsonb_build_array(
      (SELECT id FROM meal_ids WHERE name = 'Morning Juice: Beetroot Amla Carrot Lemon'),
      (SELECT id FROM meal_ids WHERE name = 'Breakfast: Aloo Paratha + Egg Omelette + Curd + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Protein Smoothie (Banana + Whey + PB + Milk)'),
      (SELECT id FROM meal_ids WHERE name = 'Lunch: Home Biryani + Raita + Dal (Sunday)'),
      (SELECT id FROM meal_ids WHERE name = 'Evening Snack: Roasted Sweet Potato + Boiled Eggs + Milk'),
      (SELECT id FROM meal_ids WHERE name = 'Dinner: Paneer Curry + Palak Dal + Rotis + Raita (Sunday)'),
      (SELECT id FROM meal_ids WHERE name = 'Before Bed: Turmeric Milk + Creatine + Magnesium')
    )
  ) AS plan_json
)
INSERT INTO weekly_meal_plans (user_id, plan_json, updated_at)
SELECT 1, weekly_plan.plan_json::text, now()
FROM weekly_plan
ON CONFLICT (user_id) DO UPDATE
  SET plan_json = EXCLUDED.plan_json,
      updated_at = now();

-- =============================================================
-- STEP 4 : HELPER QUERIES
-- Run these after inserts to validate IDs and weekly plan shape.
-- =============================================================

/*
SELECT id, name, timing, time_of_day
FROM meal_templates
WHERE user_id = 1
ORDER BY
  CASE timing
    WHEN 'pre-workout'    THEN 1
    WHEN 'post-workout'   THEN 2
    WHEN 'breakfast'      THEN 3
    WHEN 'snack'          THEN 4
    WHEN 'lunch'          THEN 5
    WHEN 'dinner'         THEN 7
    WHEN 'before-bed'     THEN 8
  END,
  time_of_day,
  name;

SELECT plan_json::jsonb AS weekly_plan_json
FROM weekly_meal_plans
WHERE user_id = 1;

-- Any missing template lookups will show null elements.
SELECT key AS date_key, value AS meal_ids
FROM weekly_meal_plans, jsonb_each(plan_json::jsonb)
WHERE user_id = 1
ORDER BY key;

-- Ensure every meal id in the plan exists for the same user.
WITH ids AS (
  SELECT jsonb_array_elements(value)::int AS meal_id
  FROM weekly_meal_plans, jsonb_each(plan_json::jsonb)
  WHERE user_id = 1
)
SELECT ids.meal_id
FROM ids
LEFT JOIN meal_templates mt ON mt.id = ids.meal_id AND mt.user_id = 1
WHERE mt.id IS NULL;
*/

-- =============================================================
-- STEP 5 : COPY THIS PLAN TO NEXT WEEK
-- =============================================================

/*
-- Example: shift every date key by +7 days.
WITH src AS (
  SELECT plan_json::jsonb AS j
  FROM weekly_meal_plans
  WHERE user_id = 1
), shifted AS (
  SELECT jsonb_object_agg(
    to_char((to_date(kv.key, 'YYYY-MM-DD') + INTERVAL '7 day')::date, 'YYYY-MM-DD'),
    kv.value
  ) AS j
  FROM src, jsonb_each(src.j) kv
)
UPDATE weekly_meal_plans w
SET plan_json = shifted.j::text,
    updated_at = now()
FROM shifted
WHERE w.user_id = 1;
*/

-- =============================================================
-- END OF SCRIPT
-- Total templates inserted : 38
-- Ingredients                : 51
-- Week covered               : Mon 13 May – Sun 19 May 2026
-- Adjust dates for subsequent weeks — meal templates are reused
-- =============================================================
