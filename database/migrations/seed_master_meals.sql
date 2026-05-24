-- =============================================================================
-- Seed: master_meal_templates — Indian meals across all timing categories
-- Run ONCE against your database. Uses ON CONFLICT DO NOTHING so it is safe
-- to re-run (duplicate rows are skipped; existing data is never overwritten).
-- Macro values are per-serving estimates. Cost is in INR unless you localise.
-- =============================================================================

-- Ensure uniqueness on name so ON CONFLICT works.
CREATE UNIQUE INDEX IF NOT EXISTS ux_master_meal_templates_name_ci
  ON master_meal_templates (lower(name));

-- =============================================================================
-- BREAKFAST
-- =============================================================================
INSERT INTO master_meal_templates
  (name, timing, time_of_day, ingredients_json, recipe,
   total_calories_kcal, total_protein_g, total_carbs_g, total_fats_g,
   estimated_total_cost, planner_notes)
VALUES

('Poha', 'breakfast', '07:30',
 '[{"name":"Flattened rice (poha)","caloriesKcal":180,"proteinG":3,"carbsG":36,"fatsG":1},{"name":"Onion","caloriesKcal":20,"proteinG":0.5,"carbsG":5,"fatsG":0},{"name":"Green peas","caloriesKcal":25,"proteinG":2,"carbsG":4,"fatsG":0},{"name":"Mustard seeds","caloriesKcal":5,"proteinG":0.2,"carbsG":0.2,"fatsG":0.3},{"name":"Curry leaves","caloriesKcal":2,"proteinG":0.1,"carbsG":0.4,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Rinse poha and drain. Temper mustard seeds and curry leaves in oil. Add onion, peas, then poha. Season with salt, turmeric and lime juice.',
 272, 5.8, 45.6, 5.8,
 30,
 'Light and easy to digest; ideal morning starter. Good for all body types. Pairs well with chai or buttermilk.'),

('Upma', 'breakfast', '08:00',
 '[{"name":"Semolina (rava)","caloriesKcal":170,"proteinG":5,"carbsG":35,"fatsG":1},{"name":"Onion","caloriesKcal":20,"proteinG":0.5,"carbsG":5,"fatsG":0},{"name":"Mixed vegetables","caloriesKcal":40,"proteinG":2,"carbsG":8,"fatsG":0},{"name":"Ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Cashews","caloriesKcal":30,"proteinG":1,"carbsG":1.5,"fatsG":2.5}]',
 'Dry roast rava. Temper cashews, onion, curry leaves in ghee. Add boiling water and roasted rava; stir until thick. Top with coriander.',
 305, 8.5, 49.5, 8.5,
 35,
 'Filling South Indian breakfast. Higher satiety than poha. Good for weight management when made with minimal ghee. Avoid for gluten-sensitive users.'),

('Idli with Sambar', 'breakfast', '08:00',
 '[{"name":"Idli (3 pieces)","caloriesKcal":150,"proteinG":5,"carbsG":30,"fatsG":1},{"name":"Sambar (1 cup)","caloriesKcal":80,"proteinG":4,"carbsG":12,"fatsG":2},{"name":"Coconut chutney","caloriesKcal":60,"proteinG":1,"carbsG":3,"fatsG":5}]',
 'Steam fermented idli batter. Serve with hot sambar and fresh coconut chutney.',
 290, 10, 45, 8,
 40,
 'Classic South Indian breakfast. High in probiotics from fermentation; great for gut health. Very low fat — good for weight-loss diets.'),

('Masala Dosa', 'breakfast', '09:00',
 '[{"name":"Dosa batter (rice+urad dal)","caloriesKcal":160,"proteinG":4,"carbsG":32,"fatsG":1},{"name":"Potato masala","caloriesKcal":120,"proteinG":3,"carbsG":22,"fatsG":3},{"name":"Oil","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Spread thin dosa on hot griddle. Add potato masala filling and fold. Serve with sambar and chutney.',
 325, 7, 54, 9,
 50,
 'Higher calorie than plain idli; suited for active individuals or weekend breakfasts. Contains complex carbs for sustained energy.'),

('Besan Chilla (Gram flour pancake)', 'breakfast', '08:00',
 '[{"name":"Besan (chickpea flour)","caloriesKcal":180,"proteinG":11,"carbsG":27,"fatsG":3},{"name":"Onion","caloriesKcal":15,"proteinG":0.4,"carbsG":3.5,"fatsG":0},{"name":"Tomato","caloriesKcal":18,"proteinG":0.8,"carbsG":3.5,"fatsG":0.2},{"name":"Green chilli","caloriesKcal":4,"proteinG":0.2,"carbsG":0.9,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Mix besan with water, spices, and chopped vegetables into a thin batter. Cook like pancakes on a non-stick pan.',
 257, 12.4, 34.9, 7.7,
 25,
 'High-protein vegetarian breakfast. Excellent for muscle maintenance and weight loss. Gluten-free. Best eaten fresh and hot with green chutney.'),

('Aloo Paratha with Curd', 'breakfast', '08:30',
 '[{"name":"Whole wheat flour","caloriesKcal":180,"proteinG":6,"carbsG":36,"fatsG":1},{"name":"Potato filling","caloriesKcal":100,"proteinG":2,"carbsG":20,"fatsG":0.5},{"name":"Butter","caloriesKcal":70,"proteinG":0,"carbsG":0,"fatsG":8},{"name":"Curd (yoghurt)","caloriesKcal":60,"proteinG":3.5,"carbsG":5,"fatsG":3}]',
 'Knead dough, stuff with spiced mashed potato, roll and cook on tawa with butter. Serve with curd.',
 410, 11.5, 61, 12.5,
 45,
 'Hearty North Indian breakfast; high energy for active or physically demanding mornings. Best as a pre-exercise meal. Avoid in large portions for weight-loss goals.'),

('Moong Dal Chilla', 'breakfast', '08:00',
 '[{"name":"Split moong dal (soaked)","caloriesKcal":150,"proteinG":12,"carbsG":26,"fatsG":1},{"name":"Ginger-green chilli paste","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Onion","caloriesKcal":15,"proteinG":0.4,"carbsG":3.5,"fatsG":0}]',
 'Blend soaked moong dal with spices. Cook thin crepes on a hot griddle with minimal oil.',
 210, 12.6, 30.5, 5.5,
 30,
 'Very high protein, low fat breakfast. Ideal for weight-loss and muscle-building goals. Gluten-free and easy to digest.'),

('Oats Upma (Indian style)', 'breakfast', '07:30',
 '[{"name":"Rolled oats","caloriesKcal":150,"proteinG":5,"carbsG":27,"fatsG":2.5},{"name":"Onion","caloriesKcal":15,"proteinG":0.4,"carbsG":3.5,"fatsG":0},{"name":"Mixed vegetables","caloriesKcal":30,"proteinG":1.5,"carbsG":6,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Mustard seeds & curry leaves","caloriesKcal":5,"proteinG":0.1,"carbsG":0.5,"fatsG":0.3}]',
 'Dry roast oats. Temper spices in oil, add vegetables, then oats with water. Cook to upma consistency.',
 240, 7, 37, 7.3,
 35,
 'High fibre, low glycaemic index. Keeps blood sugar stable. Excellent for diabetics and weight management. Ready in under 10 minutes.'),

-- =============================================================================
-- LUNCH
-- =============================================================================
('Dal Tadka with Steamed Rice', 'lunch', '13:00',
 '[{"name":"Yellow dal (toor/chana)","caloriesKcal":180,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Ghee tadka","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Tomato & onion base","caloriesKcal":35,"proteinG":1,"carbsG":7,"fatsG":0.5},{"name":"Cumin seeds","caloriesKcal":5,"proteinG":0.2,"carbsG":0.8,"fatsG":0.3}]',
 'Cook dal with tomato, turmeric, salt. Prepare ghee tadka with cumin, garlic, dry red chilli. Serve over rice.',
 465, 17.2, 79.8, 7.3,
 60,
 'Complete protein + carb meal. The classic Indian comfort lunch. Ghee aids fat-soluble vitamin absorption. Ideal for active individuals needing sustained energy.'),

('Rajma Chawal (Kidney Beans & Rice)', 'lunch', '13:00',
 '[{"name":"Kidney beans (rajma)","caloriesKcal":200,"proteinG":14,"carbsG":36,"fatsG":1},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Tomato-onion gravy","caloriesKcal":60,"proteinG":2,"carbsG":10,"fatsG":2},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Cook soaked kidney beans until tender. Prepare thick tomato-onion-spice gravy and combine. Serve over hot rice.',
 500, 20, 90, 8,
 65,
 'High protein, high fibre — very filling North Indian staple. Great for muscle building and sustained energy. Rich in iron. Recommend once or twice a week, not daily.'),

('Chole (Chickpea Curry) with Roti', 'lunch', '13:00',
 '[{"name":"Chickpeas (chole)","caloriesKcal":210,"proteinG":14,"carbsG":35,"fatsG":3},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Tomato-onion masala","caloriesKcal":60,"proteinG":2,"carbsG":10,"fatsG":2.5}]',
 'Pressure-cook soaked chickpeas. Make a spiced tomato-onion masala and combine. Serve with freshly made rotis.',
 470, 23, 85, 8.5,
 55,
 'High protein plant-based meal. Complex carbs from chickpeas + whole wheat give sustained energy. Good for weight management and vegetarians needing protein.'),

('Palak Paneer with Roti', 'lunch', '13:30',
 '[{"name":"Paneer","caloriesKcal":170,"proteinG":11,"carbsG":2,"fatsG":13},{"name":"Spinach puree","caloriesKcal":40,"proteinG":3,"carbsG":6,"fatsG":0.5},{"name":"Cream","caloriesKcal":50,"proteinG":0.5,"carbsG":1,"fatsG":5},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Tomato-onion base","caloriesKcal":40,"proteinG":1,"carbsG":7,"fatsG":1.5}]',
 'Blanch and blend spinach. Fry paneer cubes lightly. Combine in spiced spinach gravy with a touch of cream.',
 500, 22.5, 56, 23,
 90,
 'Iron-rich (spinach) + calcium and protein (paneer). Great for women, vegetarians, and muscle building. Higher fat — moderate portions for weight-loss goals.'),

('Sambhar Rice (Bisibelebath)', 'lunch', '13:00',
 '[{"name":"Rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Toor dal","caloriesKcal":150,"proteinG":10,"carbsG":26,"fatsG":0.5},{"name":"Mixed vegetables","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Bisibelebath powder & tamarind","caloriesKcal":20,"proteinG":0.5,"carbsG":4,"fatsG":0.5}]',
 'Cook rice and dal together with tamarind water, vegetables and bisibelebath spice powder. Finish with ghee.',
 465, 16.5, 84, 6.5,
 55,
 'One-pot South Indian meal. Protein + carbs + vegetables in a single dish; convenient for meal prep. Good for daily rotation.'),

('Mixed Vegetable Khichdi', 'lunch', '12:30',
 '[{"name":"Rice","caloriesKcal":150,"proteinG":3,"carbsG":33,"fatsG":0.3},{"name":"Moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Mixed vegetables","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Cumin, turmeric, ginger","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0.2}]',
 'Pressure-cook rice and dal with vegetables in a 2:1 ratio. Finish with ghee and cumin tadka.',
 380, 14.2, 66, 6,
 40,
 'Extremely digestible, gentle on the gut. Ideal for recovery days, illness, or post-workout. Low fat and balanced macros.'),

('Chicken Curry with Rice', 'lunch', '13:00',
 '[{"name":"Chicken (boneless)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Tomato-onion curry base","caloriesKcal":70,"proteinG":2,"carbsG":12,"fatsG":2.5},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Marinate and cook chicken in a spiced tomato-onion gravy. Serve over steamed rice.',
 475, 37, 56, 11.1,
 100,
 'High protein non-vegetarian lunch. Excellent for muscle building and active individuals. Lean protein with moderate carb rice base.'),

('Egg Bhurji with Roti', 'lunch', '12:30',
 '[{"name":"Eggs (3)","caloriesKcal":210,"proteinG":18,"carbsG":1.5,"fatsG":14},{"name":"Onion, tomato, capsicum","caloriesKcal":45,"proteinG":1.5,"carbsG":9,"fatsG":0.5},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Scramble eggs with sautéed onions, tomato, capsicum and spices. Serve with warm rotis.',
 495, 26.5, 50.5, 22,
 70,
 'High protein, affordable, quick to cook. Great for mid-week lunches or post-morning workout meal. Good all-around macros.'),

-- =============================================================================
-- DINNER
-- =============================================================================
('Dal Makhani with Roti', 'dinner', '20:00',
 '[{"name":"Black lentils (urad dal)","caloriesKcal":170,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Kidney beans","caloriesKcal":80,"proteinG":5,"carbsG":14,"fatsG":0.5},{"name":"Butter & cream","caloriesKcal":120,"proteinG":1,"carbsG":1,"fatsG":13},{"name":"Tomato puree","caloriesKcal":30,"proteinG":1,"carbsG":6,"fatsG":0.3},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3}]',
 'Slow-cook soaked black lentils and kidney beans overnight. Finish with butter, cream and spices.',
 600, 26, 89, 17.8,
 95,
 'Rich, slow-digesting dinner. High protein and fibre promotes overnight satiety. The fat from butter/cream supports testosterone and hormone production during sleep. Avoid excess portions if trying to lose weight.'),

('Paneer Butter Masala with Naan', 'dinner', '20:30',
 '[{"name":"Paneer","caloriesKcal":170,"proteinG":11,"carbsG":2,"fatsG":13},{"name":"Butter & cream sauce","caloriesKcal":120,"proteinG":2,"carbsG":8,"fatsG":11},{"name":"Tomato-cashew gravy","caloriesKcal":80,"proteinG":2,"carbsG":10,"fatsG":4},{"name":"Naan (1)","caloriesKcal":260,"proteinG":9,"carbsG":45,"fatsG":5}]',
 'Make a velvety tomato-cashew sauce, add paneer cubes and finish with butter. Serve with warm naan.',
 630, 24, 65, 33,
 120,
 'Indulgent restaurant-style dinner — better for occasional weekends. High fat; pair with a lighter lunch on the same day.'),

('Grilled Fish with Dal & Salad', 'dinner', '19:30',
 '[{"name":"Fish fillet (rohu/tilapia)","caloriesKcal":120,"proteinG":26,"carbsG":0,"fatsG":2},{"name":"Yellow moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Salad (cucumber, onion, tomato)","caloriesKcal":30,"proteinG":1.2,"carbsG":6,"fatsG":0.2},{"name":"Lemon & spices","caloriesKcal":5,"proteinG":0.2,"carbsG":1.3,"fatsG":0}]',
 'Marinate fish with spices and grill or pan-fry with minimal oil. Serve with dal and fresh salad.',
 285, 36.4, 29.3, 2.7,
 110,
 'Very high protein, low calorie dinner. Ideal for weight loss and lean-muscle goals. Light and easy to digest before sleep. Omega-3 rich.'),

('Methi Thepla with Curd', 'dinner', '20:00',
 '[{"name":"Whole wheat flour","caloriesKcal":180,"proteinG":6,"carbsG":36,"fatsG":1},{"name":"Fresh methi (fenugreek) leaves","caloriesKcal":15,"proteinG":1.5,"carbsG":2.5,"fatsG":0.3},{"name":"Oil/ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Spices","caloriesKcal":8,"proteinG":0.3,"carbsG":1.5,"fatsG":0.2},{"name":"Curd","caloriesKcal":60,"proteinG":3.5,"carbsG":5,"fatsG":3}]',
 'Knead dough with methi leaves and spices. Roll thin and cook on tawa with a touch of oil.',
 308, 11.3, 45, 9.5,
 40,
 'Light Gujarati dinner. Methi aids blood sugar control and digestion. Good for diabetics. Pairs well with pickle and curd for a balanced evening meal.'),

('Chicken Tikka with Salad', 'dinner', '19:30',
 '[{"name":"Chicken (boneless)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Yoghurt marinade","caloriesKcal":40,"proteinG":2.5,"carbsG":3,"fatsG":1.5},{"name":"Salad (cucumber, onion, lemon)","caloriesKcal":30,"proteinG":1.2,"carbsG":6,"fatsG":0.2},{"name":"Mint chutney","caloriesKcal":15,"proteinG":0.5,"carbsG":2.5,"fatsG":0.3}]',
 'Marinate chicken in yoghurt and spices. Grill or bake at high heat. Serve with salad and mint chutney.',
 250, 35.2, 11.5, 5.6,
 110,
 'Very high protein, low carb dinner. Ideal for weight loss and muscle-building goals. No heavy grains before sleep. Excellent for keto-leaning or low-carb diets.'),

('Vegetable Daliya (Broken Wheat Porridge)', 'dinner', '20:00',
 '[{"name":"Broken wheat (daliya)","caloriesKcal":150,"proteinG":5,"carbsG":32,"fatsG":1},{"name":"Mixed vegetables","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Moong dal","caloriesKcal":100,"proteinG":7,"carbsG":17,"fatsG":0.5},{"name":"Ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Pressure-cook daliya with dal and vegetables. Temper with ghee and cumin.',
 345, 14, 59, 6.5,
 35,
 'High-fibre, whole grain dinner. Excellent for weight management and digestive health. Low glycaemic index. Easy on the stomach — good before sleep.'),

-- =============================================================================
-- SNACK
-- =============================================================================
('Roasted Chana (Chickpeas)', 'snack', '16:00',
 '[{"name":"Roasted Bengal gram (chana)","caloriesKcal":180,"proteinG":10,"carbsG":28,"fatsG":3},{"name":"Spice mix (chaat masala, lemon)","caloriesKcal":5,"proteinG":0,"carbsG":1,"fatsG":0}]',
 'Toss roasted chana with chaat masala and a squeeze of lemon. Ready to eat.',
 185, 10, 29, 3,
 20,
 'Quick, high-protein, high-fibre snack. Keeps hunger at bay between lunch and dinner. Portable and affordable. Great for weight management.'),

('Sprouts Bhel', 'snack', '16:30',
 '[{"name":"Mixed sprouts (moong, moth)","caloriesKcal":80,"proteinG":7,"carbsG":14,"fatsG":0.5},{"name":"Onion, tomato, cucumber","caloriesKcal":30,"proteinG":1.2,"carbsG":6,"fatsG":0.2},{"name":"Chaat masala, lime juice","caloriesKcal":5,"proteinG":0,"carbsG":1.2,"fatsG":0}]',
 'Mix sprouted lentils with chopped vegetables and chaat seasoning. Serve immediately.',
 115, 8.2, 21.2, 0.7,
 25,
 'Super high-protein, very low calorie snack. Rich in live enzymes and vitamins. Ideal for weight loss and fitness-focused users. Filling without being heavy.'),

('Masala Buttermilk (Chaas)', 'snack', '15:00',
 '[{"name":"Curd","caloriesKcal":60,"proteinG":3.5,"carbsG":5,"fatsG":3},{"name":"Water","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0},{"name":"Cumin, ginger, curry leaves","caloriesKcal":5,"proteinG":0.2,"carbsG":0.8,"fatsG":0.1}]',
 'Blend curd with water, roasted cumin, fresh ginger and curry leaves. Serve chilled.',
 65, 3.7, 5.8, 3.1,
 15,
 'Probiotic-rich afternoon drink. Aids digestion, prevents afternoon bloating. Very low calorie. Good for hot climates and active users.'),

('Whole Wheat Vegetable Sandwich', 'snack', '16:00',
 '[{"name":"Whole wheat bread (2 slices)","caloriesKcal":140,"proteinG":5,"carbsG":28,"fatsG":2},{"name":"Cucumber, tomato, onion, capsicum","caloriesKcal":30,"proteinG":1,"carbsG":6,"fatsG":0.2},{"name":"Green chutney","caloriesKcal":20,"proteinG":0.5,"carbsG":3,"fatsG":0.5},{"name":"Cheese slice (optional)","caloriesKcal":60,"proteinG":3.5,"carbsG":0.5,"fatsG":5}]',
 'Layer chutney, cheese and crunchy vegetables between whole wheat slices. Toast lightly if preferred.',
 250, 10, 37.5, 7.7,
 40,
 'Balanced snack with whole grain carbs, fibre and protein. Easy to make. Suitable for mid-afternoon energy. Good for office or school snack.'),

('Makhana (Fox Nut) Snack', 'snack', '17:00',
 '[{"name":"Makhana (lotus seeds)","caloriesKcal":100,"proteinG":4,"carbsG":20,"fatsG":0.5},{"name":"Ghee","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2},{"name":"Rock salt & pepper","caloriesKcal":2,"proteinG":0,"carbsG":0.5,"fatsG":0}]',
 'Roast makhana in ghee until crisp. Season with rock salt and black pepper.',
 122, 4, 20.5, 2.7,
 40,
 'Superfood snack — high magnesium, low calorie, anti-inflammatory. Excellent for evening when avoiding heavy food. Good for weight loss and postpartum nutrition.'),

-- =============================================================================
-- PRE-WORKOUT
-- =============================================================================
('Banana & Peanut Butter on Whole Wheat Toast', 'pre-workout', '06:30',
 '[{"name":"Whole wheat toast (1 slice)","caloriesKcal":70,"proteinG":2.5,"carbsG":14,"fatsG":1},{"name":"Banana (1 medium)","caloriesKcal":90,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"name":"Peanut butter (1 tbsp)","caloriesKcal":95,"proteinG":4,"carbsG":3,"fatsG":8}]',
 'Toast the bread. Spread peanut butter and top with sliced banana.',
 255, 7.6, 40, 9.3,
 35,
 'Classic pre-workout: fast carbs from banana for immediate energy, slow carbs from toast for endurance, protein and fat from peanut butter for sustained output. Eat 30–45 minutes before training.'),

('Idli with Egg White Omelette', 'pre-workout', '07:00',
 '[{"name":"Idli (2 pieces)","caloriesKcal":100,"proteinG":3.5,"carbsG":20,"fatsG":0.7},{"name":"Egg whites (3)","caloriesKcal":51,"proteinG":11,"carbsG":0.7,"fatsG":0.2},{"name":"Onion, tomato, spices","caloriesKcal":25,"proteinG":0.8,"carbsG":5,"fatsG":0.2}]',
 'Steam idlis. Cook egg white omelette with minimal oil and spices. Eat together.',
 176, 15.3, 25.7, 1.1,
 45,
 'Low fat, moderate carb, high protein pre-workout meal. Keeps the stomach light during exercise. Ideal for early morning gym-goers.'),

('Sweet Potato Chaat', 'pre-workout', '06:30',
 '[{"name":"Boiled sweet potato","caloriesKcal":130,"proteinG":2,"carbsG":30,"fatsG":0.1},{"name":"Chaat masala, lemon, coriander","caloriesKcal":8,"proteinG":0.2,"carbsG":2,"fatsG":0},{"name":"Pomegranate seeds","caloriesKcal":20,"proteinG":0.3,"carbsG":5,"fatsG":0.1}]',
 'Cube boiled sweet potato. Toss with chaat masala, lemon juice, coriander and pomegranate seeds.',
 158, 2.5, 37, 0.2,
 40,
 'Excellent pre-workout carb source. Sweet potato is slow-burning, prevents energy crash during workout. Rich in potassium to prevent cramps. Eat 45 minutes before.'),

('Dates & Almonds', 'pre-workout', '06:00',
 '[{"name":"Dates (3-4)","caloriesKcal":90,"proteinG":0.8,"carbsG":24,"fatsG":0.1},{"name":"Almonds (10-12)","caloriesKcal":80,"proteinG":3,"carbsG":3,"fatsG":7}]',
 'Eat fresh/soft dates with a small handful of raw almonds.',
 170, 3.8, 27, 7.1,
 30,
 'Quick, portable pre-workout snack. Dates provide immediate glycogen replenishment; almonds slow digestion for sustained energy. Excellent for early morning workouts when appetite is low.'),

-- =============================================================================
-- POST-WORKOUT
-- =============================================================================
('Paneer Bhurji with Roti', 'post-workout', '09:00',
 '[{"name":"Paneer","caloriesKcal":170,"proteinG":11,"carbsG":2,"fatsG":13},{"name":"Onion, tomato, capsicum","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0.5},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Crumble and cook paneer with sautéed onion, tomato, capsicum and spices. Serve with rotis.',
 450, 19.5, 50, 21,
 80,
 'High protein vegetarian post-workout meal. Paneer provides complete protein for muscle repair; rotis replenish glycogen. Eat within 45 minutes of finishing workout.'),

('Egg Omelette with Multigrain Toast', 'post-workout', '08:30',
 '[{"name":"Eggs (2 whole + 2 whites)","caloriesKcal":190,"proteinG":20,"carbsG":1,"fatsG":11.5},{"name":"Multigrain toast (2 slices)","caloriesKcal":160,"proteinG":6,"carbsG":30,"fatsG":2.5},{"name":"Vegetables (spinach, capsicum)","caloriesKcal":20,"proteinG":1,"carbsG":3.5,"fatsG":0.2}]',
 'Whisk eggs with chopped vegetables and cook as a fluffy omelette. Serve with multigrain toast.',
 370, 27, 34.5, 14.2,
 75,
 'Ideal post-workout recovery meal. Complete amino acid profile from eggs; carbs from toast for glycogen reload. Quick to prepare. Eat within 30 minutes of training.'),

('Chicken & Vegetable Pulao', 'post-workout', '09:30',
 '[{"name":"Chicken (boneless)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Basmati rice","caloriesKcal":210,"proteinG":4.4,"carbsG":46,"fatsG":0.5},{"name":"Mixed vegetables","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Whole spices, oil","caloriesKcal":45,"proteinG":0,"carbsG":0.5,"fatsG":4.5}]',
 'Sauté whole spices and chicken. Add washed rice and vegetables. Pressure cook with water.',
 470, 37.4, 56.5, 8.6,
 105,
 'Anabolic post-workout meal: high protein from chicken + fast-digesting rice replenishes glycogen. One-pot, easy to meal-prep in advance. Excellent for muscle building goals.'),

('Curd Rice with Pomegranate', 'post-workout', '09:00',
 '[{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Curd","caloriesKcal":90,"proteinG":5,"carbsG":7,"fatsG":4.5},{"name":"Pomegranate seeds","caloriesKcal":40,"proteinG":0.5,"carbsG":10,"fatsG":0.3},{"name":"Mustard seeds, curry leaves","caloriesKcal":5,"proteinG":0.1,"carbsG":0.5,"fatsG":0.3}]',
 'Mix warm rice with cold curd and tempered mustard seeds. Top with pomegranate seeds.',
 335, 9.6, 61.5, 5.6,
 40,
 'Light and cooling post-workout meal. Probiotics from curd aid recovery and gut health. Lower protein — supplement with a protein shake or boiled eggs on heavier training days. Great for post-yoga or moderate cardio sessions.')

ON CONFLICT (lower(name)) DO NOTHING;

-- =============================================================================
-- Backfill: link existing user meal_templates to master catalog by matching name
-- (case-insensitive). Only updates rows that have no existing master link.
-- Run after inserting master rows above.
-- =============================================================================
UPDATE meal_templates mt
SET master_meal_template_id = mmt.id
FROM master_meal_templates mmt
WHERE lower(mt.name) = lower(mmt.name)
  AND mt.master_meal_template_id IS NULL;
