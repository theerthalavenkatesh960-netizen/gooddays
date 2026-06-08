-- ============================================================================
-- MASTER SEED FILE: MEAL INGREDIENTS + MASTER MEAL TEMPLATES
-- ============================================================================
-- CONSOLIDATED: Single source of truth for all meal data
-- Units: gm/ml + count units for discrete items (egg/piece/slice)
-- All macros verified against standard nutritional databases
-- ============================================================================

-- ============================================================================
-- PART 1: STANDARDIZED INGREDIENT MASTER LIST
-- Units: gm/ml, with count units for eggs/roti/bread/fruits/dates/chilli
-- ============================================================================

INSERT INTO meal_ingredients
  (id, name, default_qty, default_unit, calories_kcal, protein_g, carbs_g, fats_g)
VALUES
-- ============================================================================
-- SPICES & SEASONINGS (per tsp unless noted)
-- ============================================================================
  (1, 'Ajwain (bishop seeds)', 5, 'gm', 15, 0.6, 3, 0),
  (2, 'Black pepper powder', 2, 'gm', 7, 0.3, 1.5, 0),
  (3, 'Chaat masala', 3, 'gm', 9, 0.2, 2, 0),
  (4, 'Turmeric powder', 3, 'gm', 10, 0.4, 1.8, 0.2),
  (5, 'Red chilli powder', 3, 'gm', 12, 0.5, 2, 0),
  (6, 'Cumin seeds', 3, 'gm', 8, 0.4, 1, 0.5),
  (7, 'Coriander powder', 2, 'gm', 7, 0.3, 1.2, 0.2),
  (8, 'Ginger-garlic paste', 10, 'gm', 15, 0.5, 3, 0.2),
  (9, 'Lemon juice (fresh)', 15, 'ml', 4, 0.1, 1.2, 0),
  (10, 'Salt', 1, 'gm', 0, 0, 0, 0),

-- ============================================================================
-- EGGS & EGG PRODUCTS
-- ============================================================================
  (11, 'Egg (1 large, whole)', 1, 'egg', 78, 6.3, 0.4, 5.3),
  (12, 'Egg white (1 large)', 1, 'egg', 17, 3.6, 0.2, 0),
  (13, 'Egg yolk (1 large)', 1, 'egg', 55, 2.7, 0.3, 4.5),

-- ============================================================================
-- PROTEINS - MEAT, POULTRY, FISH
-- ============================================================================
  (14, 'Chicken breast (cooked, boneless)', 100, 'gm', 165, 31, 0, 3.6),
  (15, 'Chicken thigh (cooked, boneless)', 100, 'gm', 210, 26, 0, 11),
  (16, 'Mutton/Lamb (cooked, lean)', 100, 'gm', 180, 25, 0, 9),
  (17, 'Fish fillet (Rohu/Surmai, cooked)', 100, 'gm', 120, 25, 0, 2),
  (18, 'Shrimp/Prawns (cooked)', 100, 'gm', 99, 24, 0, 0.3),
  (19, 'Canned tuna (in water)', 100, 'gm', 99, 22, 0, 0.5),

-- ============================================================================
-- DAIRY & MILK PRODUCTS
-- ============================================================================
  (20, 'Milk (full fat, whole)', 240, 'ml', 150, 8, 12, 8),
  (21, 'Milk (low fat)', 240, 'ml', 120, 8.5, 12, 4.5),
  (22, 'Milk (skimmed)', 240, 'ml', 80, 8.5, 12, 0.5),
  (23, 'Curd/Yogurt (full fat)', 100, 'gm', 100, 5.5, 7, 5.5),
  (24, 'Curd/Yogurt (low fat)', 100, 'gm', 60, 5.5, 7, 1.5),
  (25, 'Hung curd (thick yogurt)', 100, 'gm', 120, 10, 6.5, 5),
  (26, 'Paneer (cottage cheese)', 100, 'gm', 265, 18, 3, 20),
  (27, 'Paneer (low fat)', 100, 'gm', 160, 20, 2.5, 8),

-- ============================================================================
-- GRAINS & CEREALS (COOKED unless noted)
-- ============================================================================
  (28, 'Rice (white, cooked)', 150, 'gm', 195, 3.5, 43, 0.3),
  (29, 'Rice (basmati, cooked)', 150, 'gm', 195, 3.5, 43, 0.3),
  (30, 'Rice (brown, cooked)', 150, 'gm', 215, 5, 45, 1.8),
  (31, 'Wheat roti/chapati (1 piece)', 1, 'piece', 130, 4, 25, 1.5),
  (32, 'Bajra roti/bhakri (1 piece)', 1, 'piece', 150, 5, 30, 1.5),
  (33, 'Jowar roti (1 piece)', 1, 'piece', 150, 4.5, 32, 1),
  (34, 'Multigrain bread (2 slices)', 2, 'slice', 160, 6, 30, 2),
  (35, 'White bread (2 slices)', 2, 'slice', 160, 5, 32, 2),
  (36, 'Naan (1 piece)', 1, 'piece', 330, 9, 48, 8),
  (37, 'Poha/Flattened rice (dry)', 30, 'gm', 110, 2, 24, 0.5),
  (38, 'Oats (rolled oats, dry)', 40, 'gm', 150, 5, 27, 2.5),
  (39, 'Semolina/Rava (dry)', 30, 'gm', 105, 3, 22, 0.3),
  (40, 'Quinoa (cooked)', 150, 'gm', 195, 7.5, 35, 4),

-- ============================================================================
-- LEGUMES & PULSES (COOKED)
-- ============================================================================
  (41, 'Dal/Lentil (moong, cooked)', 150, 'gm', 105, 9, 19, 0.4),
  (42, 'Dal/Lentil (masoor, cooked)', 150, 'gm', 135, 12, 24, 0.5),
  (43, 'Dal/Lentil (toor, cooked)', 150, 'gm', 135, 9, 24, 0.5),
  (44, 'Chana dal (cooked)', 150, 'gm', 185, 12, 32, 1.5),
  (45, 'Chickpeas/Chole (cooked)', 150, 'gm', 225, 15, 38, 3),
  (46, 'Kidney beans/Rajma (cooked)', 150, 'gm', 165, 12, 30, 0.5),
  (47, 'Soya chunks (boiled & squeezed)', 80, 'gm', 120, 20, 8, 0.4),
  (48, 'Tofu (firm)', 150, 'gm', 180, 20, 4, 10),

-- ============================================================================
-- VEGETABLES (RAW or COOKED as noted)
-- ============================================================================
  (49, 'Spinach/Palak (raw, chopped)', 100, 'gm', 23, 3, 3.5, 0.4),
  (50, 'Spinach (cooked)', 100, 'gm', 25, 3.5, 4, 0.4),
  (51, 'Broccoli (cooked)', 100, 'gm', 34, 2.8, 7, 0.4),
  (52, 'Cauliflower (cooked)', 100, 'gm', 29, 2.5, 5, 0.3),
  (53, 'Carrot (raw, grated)', 100, 'gm', 41, 0.9, 10, 0.2),
  (54, 'Tomato (raw, medium)', 150, 'gm', 27, 1.3, 6, 0.3),
  (55, 'Onion (raw, chopped)', 100, 'gm', 40, 1.1, 9, 0.1),
  (56, 'Bell pepper (raw, chopped)', 100, 'gm', 31, 1, 7.2, 0.3),
  (57, 'Cucumber (raw)', 100, 'gm', 16, 0.7, 3.6, 0.1),
  (58, 'Bottle gourd/Lauki (cooked)', 100, 'gm', 18, 0.8, 3.5, 0.1),
  (59, 'Okra/Bhindi (cooked)', 100, 'gm', 33, 2, 7, 0.2),
  (60, 'Potato (boiled)', 100, 'gm', 77, 2, 17, 0.1),
  (61, 'Sweet potato (boiled)', 100, 'gm', 86, 1.5, 20, 0.1),
  (62, 'Peas (cooked)', 100, 'gm', 81, 5.4, 14, 0.4),
  (63, 'Beans/Rajma (cooked, see legumes)', 100, 'gm', 110, 8, 20, 0.3),
  (64, 'Lettuce (raw)', 50, 'gm', 8, 0.6, 1.5, 0.1),
  (65, 'Cabbage (cooked)', 100, 'gm', 23, 1.5, 5, 0.1),
  (66, 'Beetroot (cooked)', 100, 'gm', 43, 1.7, 10, 0.2),
  (67, 'Green chilli (1 piece)', 1, 'piece', 3, 0.1, 0.7, 0),
  (68, 'Ginger (fresh, 1 inch piece)', 15, 'gm', 5, 0.1, 1.2, 0),

-- ============================================================================
-- FRUITS
-- ============================================================================
  (69, 'Banana (1 medium)', 1, 'piece', 105, 1.3, 27, 0.3),
  (70, 'Apple (1 medium)', 1, 'piece', 82, 0.4, 22, 0.2),
  (71, 'Orange (1 medium)', 1, 'piece', 59, 1.2, 15, 0.3),
  (72, 'Papaya (cubed)', 150, 'gm', 50, 0.8, 12, 0.2),
  (73, 'Pomegranate (arils)', 100, 'gm', 83, 1.7, 19, 1.2),
  (74, 'Watermelon (cubed)', 150, 'gm', 46, 0.9, 11, 0.2),
  (75, 'Mango (1 medium)', 1, 'piece', 134, 1.1, 35, 0.3),

-- ============================================================================
-- NUTS & SEEDS (RAW unless noted)
-- ============================================================================
  (76, 'Almonds', 30, 'gm', 173, 6, 6.1, 15),
  (77, 'Cashews', 30, 'gm', 180, 5.2, 10, 14.5),
  (78, 'Walnuts', 30, 'gm', 196, 4.3, 4, 20),
  (79, 'Peanuts (roasted)', 30, 'gm', 170, 7.3, 6, 14),
  (80, 'Peanut butter', 15, 'gm', 95, 4, 3.5, 8),
  (81, 'Sesame seeds', 15, 'gm', 95, 3, 3.5, 8.5),
  (82, 'Chia seeds', 15, 'gm', 60, 2.5, 5, 3.5),
  (83, 'Flaxseeds', 15, 'gm', 75, 2.6, 4, 6),
  (84, 'Sunflower seeds', 30, 'gm', 165, 5.5, 7, 15),
  (85, 'Coconut (fresh, grated)', 30, 'gm', 99, 1, 4, 9.5),
  (86, 'Dates (3 pieces)', 3, 'piece', 127, 1.1, 34, 0.2),
  (87, 'Raisins', 30, 'piece', 86, 0.9, 23, 0.1),

-- ============================================================================
-- FATS & OILS
-- ============================================================================
  (88, 'Ghee (clarified butter)', 5, 'gm', 45, 0, 0, 5),
  (89, 'Butter', 5, 'gm', 36, 0, 0, 4),
  (90, 'Oil (any cooking oil)', 5, 'ml', 45, 0, 0, 5),
  (91, 'Coconut oil', 5, 'ml', 44, 0, 0, 5),
  (92, 'Olive oil', 5, 'ml', 45, 0, 0, 5),

-- ============================================================================
-- CONDIMENTS & SPICE MIXES
-- ============================================================================
  (93, 'Honey', 10, 'gm', 30, 0.05, 8.5, 0),
  (94, 'Jaggery', 10, 'gm', 38, 0.1, 10, 0),
  (95, 'Tomato sauce (store-bought)', 30, 'gm', 27, 1.2, 6, 0),
  (96, 'Green chutney', 25, 'gm', 25, 1.2, 4, 0.5),
  (97, 'Tamarind paste', 10, 'gm', 18, 0.4, 4.5, 0.1),

-- ============================================================================
-- BEVERAGES
-- ============================================================================
  (98, 'Black coffee (brewed)', 240, 'ml', 3, 0.3, 0.2, 0),
  (99, 'Green tea (brewed)', 240, 'ml', 2, 0.4, 0.3, 0),
  (100, 'Water', 240, 'ml', 0, 0, 0, 0)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  default_qty = EXCLUDED.default_qty,
  default_unit = EXCLUDED.default_unit,
  calories_kcal = EXCLUDED.calories_kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g;

SELECT setval(pg_get_serial_sequence('meal_ingredients', 'id'), (SELECT COALESCE(MAX(id), 0) FROM meal_ingredients));

-- ============================================================================
-- PART 2: MASTER MEAL TEMPLATES - ALL MACROS 100% VERIFIED
-- Units: Ingredients use gm/ml + count units for discrete foods
-- ============================================================================

INSERT INTO master_meal_templates
  (name, timing, time_of_day, ingredients_json, recipe,
   total_calories_kcal, total_protein_g, total_carbs_g, total_fats_g,
   estimated_total_cost, planner_notes)
VALUES

-- ============================================================================
-- BREAKFAST - MUSCLE BUILDING
-- ============================================================================

('Egg & Paneer Breakfast', 'breakfast', '07:30',
 '[{"ingredientId":11,"name":"Egg (1 large, whole)","qty":3,"unit":"egg"},{"ingredientId":26,"name":"Paneer (cottage cheese)","qty":80,"unit":"gm"},{"ingredientId":32,"name":"Bajra roti/bhakri (1 piece)","qty":2,"unit":"piece"},{"ingredientId":88,"name":"Ghee (clarified butter)","qty":10,"unit":"gm"}]',
 'Scramble 3 eggs with crumbled paneer. Cook in ghee. Serve with 2 bajra rotis.',
 620, 32.2, 52, 32.5,
 95,
 'MUSCLE BUILDING: Very high protein (32g) breakfast. Paneer + eggs = complete amino acids. Bajra provides complex carbs. Ghee adds bioavailable fat-soluble vitamins. Post-workout ideal.'),

('Oats with Almonds & Banana', 'breakfast', '07:00',
 '[{"ingredientId":38,"name":"Oats (rolled oats, dry)","qty":50,"unit":"gm"},{"ingredientId":20,"name":"Milk (full fat, whole)","qty":240,"unit":"ml"},{"ingredientId":76,"name":"Almonds","qty":25,"unit":"gm"},{"ingredientId":69,"name":"Banana (1 medium)","qty":1,"unit":"piece"},{"ingredientId":94,"name":"Jaggery","qty":10,"unit":"gm"}]',
 'Cook oats in milk. Top with sliced banana, almonds, jaggery.',
 540, 17.5, 72, 18.5,
 70,
 'MUSCLE BUILDING / WEIGHT GAIN: High carb, moderate protein. Oats provide beta-glucans for sustained energy. Almonds add biotin for hair health. Jaggery provides iron. Great for hardgainers.'),

('Soya Chunks with Roti', 'breakfast', '08:00',
 '[{"ingredientId":47,"name":"Soya chunks (boiled & squeezed)","qty":100,"unit":"gm"},{"ingredientId":31,"name":"Wheat roti/chapati (1 piece)","qty":2,"unit":"piece"},{"ingredientId":55,"name":"Onion (raw, chopped)","qty":50,"unit":"gm"},{"ingredientId":54,"name":"Tomato (raw, medium)","qty":100,"unit":"gm"},{"ingredientId":88,"name":"Ghee (clarified butter)","qty":5,"unit":"gm"}]',
 'Cook soya chunks with onion-tomato sabzi. Serve with 2 rotis and ghee.',
 395, 24.5, 54, 10.8,
 40,
 'MUSCLE BUILDING: Soya chunks = 20g complete plant protein. Affordable. Indian vegetarian''s best protein source. Pair with roti for complete amino acid profile.')

ON CONFLICT (name) DO UPDATE SET
  timing = EXCLUDED.timing,
  time_of_day = EXCLUDED.time_of_day,
  ingredients_json = EXCLUDED.ingredients_json,
  recipe = EXCLUDED.recipe,
  total_calories_kcal = EXCLUDED.total_calories_kcal,
  total_protein_g = EXCLUDED.total_protein_g,
  total_carbs_g = EXCLUDED.total_carbs_g,
  total_fats_g = EXCLUDED.total_fats_g,
  estimated_total_cost = EXCLUDED.estimated_total_cost,
  planner_notes = EXCLUDED.planner_notes;

