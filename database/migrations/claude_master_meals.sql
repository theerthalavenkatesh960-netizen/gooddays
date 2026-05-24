-- =============================================================================
-- Seed: master_meal_templates — Comprehensive Indian Meal Library
-- 150+ meals across all timing categories and health goals:
--   Muscle Building | Fat Loss | Weight Loss | Weight Gain | Health Maintenance
--   Includes: Breakfast, Lunch, Dinner, Snack, Juice, Pre-Workout, Post-Workout
--
-- Safe to re-run: ON CONFLICT DO NOTHING skips existing rows.
-- Macro values are per-serving estimates. Cost is in INR.
-- All goal/condition notes are embedded in planner_notes only.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_master_meal_templates_name_ci
  ON master_meal_templates (lower(name));

-- =============================================================================
-- BREAKFAST — Muscle Building
-- =============================================================================
INSERT INTO master_meal_templates
  (name, timing, time_of_day, ingredients_json, recipe,
   total_calories_kcal, total_protein_g, total_carbs_g, total_fats_g,
   estimated_total_cost, planner_notes)
VALUES

('Paneer Scramble with Multigrain Toast', 'breakfast', '07:30',
 '[{"name":"Paneer (crumbled)","caloriesKcal":200,"proteinG":13,"carbsG":3,"fatsG":15},{"name":"Eggs (2 whole)","caloriesKcal":140,"proteinG":12,"carbsG":1,"fatsG":9},{"name":"Capsicum and onion","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Multigrain toast (2 slices)","caloriesKcal":160,"proteinG":6,"carbsG":30,"fatsG":2.5},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Sauté capsicum and onion. Add crumbled paneer and beaten eggs. Scramble together with spices. Serve on multigrain toast.',
 565, 32, 39, 31,
 95,
 'MUSCLE BUILDING. Very high protein combination of paneer + eggs. Complete amino acid profile. High calorie breakfast suited for bulking phases. Pair with a glass of milk for extra protein.'),

('Egg White Omelette with Sprouted Moong', 'breakfast', '07:00',
 '[{"name":"Egg whites (5)","caloriesKcal":85,"proteinG":18,"carbsG":1,"fatsG":0.3},{"name":"Sprouted moong","caloriesKcal":80,"proteinG":7,"carbsG":14,"fatsG":0.5},{"name":"Onion, tomato, coriander","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Oil spray","caloriesKcal":15,"proteinG":0,"carbsG":0,"fatsG":1.5}]',
 'Blend egg whites with spices. Pour into pan, top with sprouted moong and vegetables. Fold and serve.',
 205, 26, 20, 2.3,
 55,
 'MUSCLE BUILDING / FAT LOSS. Very high protein, very low fat, low calorie. Egg whites provide pure lean protein; moong sprouts add plant protein and fibre. Excellent for cutting phase with muscle retention.'),

('Oats Protein Porridge with Banana', 'breakfast', '07:00',
 '[{"name":"Rolled oats","caloriesKcal":150,"proteinG":5,"carbsG":27,"fatsG":2.5},{"name":"Milk (full fat)","caloriesKcal":150,"proteinG":8,"carbsG":12,"fatsG":8},{"name":"Banana","caloriesKcal":90,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"name":"Peanut butter (1 tbsp)","caloriesKcal":95,"proteinG":4,"carbsG":3,"fatsG":8},{"name":"Chia seeds (1 tsp)","caloriesKcal":25,"proteinG":0.8,"carbsG":2,"fatsG":1.5}]',
 'Cook oats in milk. Top with sliced banana, peanut butter and chia seeds.',
 510, 18.9, 67, 20.3,
 70,
 'MUSCLE BUILDING / WEIGHT GAIN. Calorie-dense, high-carb, moderate protein breakfast. Oats provide slow-releasing energy; banana replenishes glycogen; peanut butter and chia seeds add healthy fats. Great for hardgainers and morning trainers.'),

('Masala Egg Fried Rice (Leftover Rice)', 'breakfast', '08:00',
 '[{"name":"Cooked rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Eggs (3)","caloriesKcal":210,"proteinG":18,"carbsG":1.5,"fatsG":14},{"name":"Onion, capsicum, peas","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Soy sauce, oil, spices","caloriesKcal":55,"proteinG":0.5,"carbsG":2,"fatsG":5}]',
 'Heat oil, scramble eggs, add vegetables and cold cooked rice. Season with soy sauce and spices. Toss on high heat.',
 515, 24.5, 57.5, 19.5,
 55,
 'MUSCLE BUILDING. High protein, high carb breakfast that uses leftover rice. Quick meal prep option. Good post-morning workout or for active mornings. High calorie for bulking.'),

('Soya Chunk Poha', 'breakfast', '08:00',
 '[{"name":"Flattened rice (poha)","caloriesKcal":180,"proteinG":3,"carbsG":36,"fatsG":1},{"name":"Soya chunks (mini)","caloriesKcal":100,"proteinG":16,"carbsG":8,"fatsG":0.5},{"name":"Onion, tomato, peas","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Oil, mustard seeds, curry leaves","caloriesKcal":45,"proteinG":0.2,"carbsG":0.5,"fatsG":4.8}]',
 'Boil soya chunks, squeeze dry. Cook standard poha tempering, add soya chunks and poha. Mix and cook 3 minutes.',
 365, 20.7, 52.5, 6.3,
 40,
 'MUSCLE BUILDING (vegetarian). Regular poha upgraded with soya chunks for high plant protein. Great for vegetarians targeting muscle gain. Affordable and filling.'),

-- =============================================================================
-- BREAKFAST — Weight Loss / Fat Loss
-- =============================================================================

('Vegetable Oats Chilla', 'breakfast', '07:30',
 '[{"name":"Rolled oats (ground)","caloriesKcal":100,"proteinG":3.5,"carbsG":18,"fatsG":1.5},{"name":"Besan","caloriesKcal":90,"proteinG":5.5,"carbsG":13.5,"fatsG":1.5},{"name":"Spinach, grated carrot, onion","caloriesKcal":30,"proteinG":1.5,"carbsG":6,"fatsG":0},{"name":"Oil spray","caloriesKcal":15,"proteinG":0,"carbsG":0,"fatsG":1.5}]',
 'Mix ground oats and besan with water, vegetables and spices. Cook thin pancakes on non-stick pan with minimal oil spray.',
 235, 10.5, 37.5, 4.5,
 30,
 'FAT LOSS / WEIGHT LOSS. Very low calorie, high fibre, moderate protein. Oats keep blood sugar stable; besan boosts protein. Gluten-flexible. Eat 2 chillas for a filling low-calorie breakfast under 250 kcal.'),

('Greek-style Hung Curd with Fruit', 'breakfast', '08:00',
 '[{"name":"Hung curd (thick dahi)","caloriesKcal":100,"proteinG":10,"carbsG":6,"fatsG":4},{"name":"Papaya (cubed)","caloriesKcal":55,"proteinG":0.5,"carbsG":14,"fatsG":0.2},{"name":"Pomegranate seeds","caloriesKcal":40,"proteinG":0.5,"carbsG":10,"fatsG":0.3},{"name":"Flaxseed powder (1 tsp)","caloriesKcal":18,"proteinG":0.6,"carbsG":1,"fatsG":1.2}]',
 'Hang curd overnight for thick consistency. Layer in a bowl with fruit and top with flaxseed powder.',
 213, 11.6, 31, 5.7,
 50,
 'FAT LOSS. High protein, low calorie, probiotic-rich. Hung curd is Indian-style Greek yoghurt. Papaya aids digestion and fat metabolism. Low glycaemic index. Excellent for maintaining muscle during calorie deficit.'),

('Ragi Dosa with Coconut Chutney', 'breakfast', '08:00',
 '[{"name":"Ragi (finger millet) flour","caloriesKcal":145,"proteinG":3.5,"carbsG":30,"fatsG":0.5},{"name":"Urad dal (soaked)","caloriesKcal":60,"proteinG":5,"carbsG":10,"fatsG":0.3},{"name":"Onion, coriander, green chilli","caloriesKcal":20,"proteinG":0.8,"carbsG":4,"fatsG":0},{"name":"Coconut chutney (small serving)","caloriesKcal":60,"proteinG":1,"carbsG":3,"fatsG":5},{"name":"Oil","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2}]',
 'Mix ragi flour with urad dal paste, water and seasoning. Spread thin dosas. Serve with chutney.',
 305, 10.3, 47, 8,
 35,
 'WEIGHT LOSS / HEALTH MAINTENANCE. Ragi is extremely high in calcium and dietary fibre. Very low glycaemic index — ideal for diabetics and those managing weight. Keeps you full for 4+ hours. Rich in iron for hair health too.'),

('Vegetable Daliya Porridge (Savoury)', 'breakfast', '07:30',
 '[{"name":"Broken wheat (daliya)","caloriesKcal":150,"proteinG":5,"carbsG":32,"fatsG":1},{"name":"Spinach, beans, carrot","caloriesKcal":40,"proteinG":2,"carbsG":8,"fatsG":0},{"name":"Ghee (half tsp)","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2},{"name":"Onion, ginger, cumin","caloriesKcal":15,"proteinG":0.5,"carbsG":3,"fatsG":0}]',
 'Roast daliya dry. Add water, ghee, spices and vegetables and pressure cook. Serve hot.',
 225, 7.5, 43, 3.2,
 30,
 'WEIGHT LOSS. High fibre, low fat, whole grain breakfast. Broken wheat is slow-digesting and very filling. Excellent choice for sustainable calorie reduction. Suitable for breakfast or dinner.'),

-- =============================================================================
-- BREAKFAST — Weight Gain
-- =============================================================================

('Banana Peanut Butter Milkshake Breakfast Bowl', 'breakfast', '08:30',
 '[{"name":"Full fat milk","caloriesKcal":150,"proteinG":8,"carbsG":12,"fatsG":8},{"name":"Banana (2)","caloriesKcal":180,"proteinG":2.2,"carbsG":46,"fatsG":0.6},{"name":"Peanut butter (2 tbsp)","caloriesKcal":190,"proteinG":8,"carbsG":6,"fatsG":16},{"name":"Oats","caloriesKcal":75,"proteinG":2.5,"carbsG":13.5,"fatsG":1.2},{"name":"Honey","caloriesKcal":64,"proteinG":0.1,"carbsG":17.4,"fatsG":0}]',
 'Blend milk, bananas and peanut butter. Pour over soaked oats and drizzle with honey.',
 659, 20.8, 94.9, 25.8,
 75,
 'WEIGHT GAIN. Very calorie-dense, high-carb breakfast. Excellent for hardgainers who struggle to eat large volumes of food. Blending increases caloric intake without bulk. Can be consumed quickly post-workout for glycogen replenishment.'),

('Ghee Rice with Moong Dal and Papad', 'breakfast', '09:00',
 '[{"name":"Cooked basmati rice","caloriesKcal":250,"proteinG":5,"carbsG":55,"fatsG":0.5},{"name":"Moong dal (cooked)","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Ghee (2 tsp)","caloriesKcal":90,"proteinG":0,"carbsG":0,"fatsG":10},{"name":"Roasted papad (2)","caloriesKcal":50,"proteinG":2.5,"carbsG":8,"fatsG":1}]',
 'Toss hot rice in ghee. Serve alongside cooked moong dal and crunchy papad.',
 520, 16.5, 85, 12,
 45,
 'WEIGHT GAIN. High calorie, traditional combination. Ghee adds healthy saturated fat for calorie surplus. Suitable for underweight individuals or those in hard bulking phase. Easy on digestion.'),

('Suji Halwa with Milk', 'breakfast', '09:00',
 '[{"name":"Semolina (rava)","caloriesKcal":170,"proteinG":5,"carbsG":35,"fatsG":1},{"name":"Ghee","caloriesKcal":90,"proteinG":0,"carbsG":0,"fatsG":10},{"name":"Sugar","caloriesKcal":80,"proteinG":0,"carbsG":20,"fatsG":0},{"name":"Cashews and raisins","caloriesKcal":60,"proteinG":1.5,"carbsG":7,"fatsG":3},{"name":"Full fat milk (1 glass)","caloriesKcal":150,"proteinG":8,"carbsG":12,"fatsG":8}]',
 'Roast rava in ghee until golden. Add boiling water and sugar. Cook till thick. Serve with cold milk.',
 550, 14.5, 74, 22,
 55,
 'WEIGHT GAIN. Traditional high-calorie Indian sweet breakfast. Dense with carbohydrates and healthy fats. Pair with milk to increase protein. Suitable for post-illness recovery and underweight individuals. Not recommended for fat loss goals.'),

-- =============================================================================
-- BREAKFAST — Health Maintenance / Leafy Vegetables / Hair Care
-- =============================================================================

('Palak Moong Dal Chilla', 'breakfast', '08:00',
 '[{"name":"Split moong dal (soaked and ground)","caloriesKcal":150,"proteinG":12,"carbsG":26,"fatsG":1},{"name":"Spinach (palak, blanched and blended)","caloriesKcal":20,"proteinG":2,"carbsG":3,"fatsG":0.3},{"name":"Green chilli, ginger, cumin","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0},{"name":"Oil spray","caloriesKcal":15,"proteinG":0,"carbsG":0,"fatsG":1.5}]',
 'Blend soaked moong dal with blanched spinach, ginger and spices. Cook thin crepes on a hot griddle.',
 190, 14.2, 30, 2.8,
 30,
 'HEALTH MAINTENANCE / HAIR CARE. Spinach is rich in iron, folate and biotin — key nutrients for hair growth and scalp health. Moong dal provides plant protein for keratin production. Low calorie, high nutrient density. Excellent daily breakfast.'),

('Methi Paratha with Curd', 'breakfast', '08:30',
 '[{"name":"Whole wheat flour","caloriesKcal":180,"proteinG":6,"carbsG":36,"fatsG":1},{"name":"Fresh methi (fenugreek) leaves","caloriesKcal":15,"proteinG":1.5,"carbsG":2.5,"fatsG":0.3},{"name":"Ajwain, turmeric, salt","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0},{"name":"Ghee (half tsp)","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2},{"name":"Curd (low fat)","caloriesKcal":50,"proteinG":3,"carbsG":4,"fatsG":2}]',
 'Knead methi leaves into whole wheat dough with spices. Roll and cook parathas. Serve with curd.',
 270, 10.7, 43.5, 5.5,
 35,
 'HEALTH MAINTENANCE / HAIR CARE. Methi (fenugreek) is one of the best foods for hair health — rich in iron, folic acid and protein. It also stabilises blood sugar and aids digestion. A nutritious daily breakfast option.'),

('Poha with Curry Leaves and Peanuts', 'breakfast', '07:30',
 '[{"name":"Flattened rice (poha)","caloriesKcal":180,"proteinG":3,"carbsG":36,"fatsG":1},{"name":"Roasted peanuts","caloriesKcal":80,"proteinG":4,"carbsG":3,"fatsG":6.5},{"name":"Curry leaves (generous)","caloriesKcal":8,"proteinG":0.5,"carbsG":1.5,"fatsG":0.1},{"name":"Turmeric, mustard, oil","caloriesKcal":45,"proteinG":0.2,"carbsG":0.8,"fatsG":4.8}]',
 'Rinse poha. Temper mustard seeds and generous curry leaves in oil. Add peanuts and poha. Toss and serve.',
 313, 7.7, 41.3, 12.4,
 28,
 'HEALTH MAINTENANCE. Curry leaves are exceptionally rich in antioxidants and are traditionally used for hair loss prevention. Peanuts add protein and biotin. Iron-rich turmeric reduces inflammation. Light, energising and quick breakfast.'),

-- =============================================================================
-- LUNCH — Muscle Building
-- =============================================================================

('Chicken Biryani (Brown Rice)', 'lunch', '13:00',
 '[{"name":"Chicken (boneless)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Brown basmati rice","caloriesKcal":220,"proteinG":5,"carbsG":46,"fatsG":1.5},{"name":"Onion, tomato, yoghurt marinade","caloriesKcal":80,"proteinG":3.5,"carbsG":14,"fatsG":2},{"name":"Whole spices, saffron, oil","caloriesKcal":50,"proteinG":0.5,"carbsG":1,"fatsG":4.5}]',
 'Marinate chicken in yoghurt and spices. Layer over par-boiled brown rice and dum cook until aromatic.',
 515, 40, 61, 11.6,
 120,
 'MUSCLE BUILDING. High protein, complex carbohydrate meal. Brown rice provides slow-releasing energy and extra fibre. Excellent anabolic lunch for gym-goers. Meal-prep friendly — scales easily for bulk cooking.'),

('Soya Chunk Curry with Jeera Rice', 'lunch', '13:00',
 '[{"name":"Soya chunks","caloriesKcal":160,"proteinG":26,"carbsG":13,"fatsG":1},{"name":"Tomato-onion masala","caloriesKcal":70,"proteinG":2,"carbsG":12,"fatsG":3},{"name":"Jeera rice","caloriesKcal":220,"proteinG":4.5,"carbsG":47,"fatsG":1.5},{"name":"Ghee","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Boil soya chunks and cook in a spiced tomato-onion gravy. Serve over cumin-tempered jeera rice.',
 495, 32.5, 72, 10.5,
 55,
 'MUSCLE BUILDING (vegetarian). Soya chunks are the highest plant-based protein source available in India at under ₹60/meal. 26g protein from soya alone. Complete meal for vegetarian athletes. Very affordable.'),

('Egg Curry with Brown Rice', 'lunch', '13:00',
 '[{"name":"Boiled eggs (4)","caloriesKcal":280,"proteinG":24,"carbsG":2,"fatsG":19},{"name":"Onion-tomato masala","caloriesKcal":80,"proteinG":2.5,"carbsG":13,"fatsG":3},{"name":"Brown rice","caloriesKcal":220,"proteinG":5,"carbsG":46,"fatsG":1.5},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Hard boil and halve eggs. Make spiced masala gravy. Add eggs and simmer 5 minutes. Serve with brown rice.',
 620, 31.5, 61, 28,
 75,
 'MUSCLE BUILDING. Very high protein, high calorie lunch. Eggs provide complete amino acids. Affordable muscle-building meal. Brown rice keeps insulin response moderate for sustained energy.'),

('Mutton Keema with Roti', 'lunch', '13:30',
 '[{"name":"Mutton keema (minced)","caloriesKcal":250,"proteinG":27,"carbsG":0,"fatsG":15},{"name":"Onion, tomato, ginger-garlic","caloriesKcal":60,"proteinG":2,"carbsG":12,"fatsG":1},{"name":"Whole wheat roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Peas","caloriesKcal":40,"proteinG":3,"carbsG":7,"fatsG":0.3},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Cook keema with onions and spices until dry. Add peas. Serve with fresh rotis.',
 590, 39, 59, 23.8,
 130,
 'MUSCLE BUILDING. Very high protein non-veg meal. Mutton keema is extremely rich in B12, iron, zinc — essential for muscle recovery and testosterone production. Recommend 2x per week maximum.'),

('Paneer Tikka Wrap (Whole Wheat)', 'lunch', '13:00',
 '[{"name":"Paneer","caloriesKcal":200,"proteinG":13,"carbsG":3,"fatsG":15},{"name":"Whole wheat roti/wrap base","caloriesKcal":120,"proteinG":4,"carbsG":24,"fatsG":1.5},{"name":"Hung curd marinade","caloriesKcal":50,"proteinG":4,"carbsG":3,"fatsG":2},{"name":"Capsicum, onion, lettuce","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Mint chutney","caloriesKcal":15,"proteinG":0.5,"carbsG":2.5,"fatsG":0.3}]',
 'Marinate paneer cubes in spiced hung curd. Grill or tawa-roast. Wrap in roti with vegetables and chutney.',
 410, 22.5, 37.5, 18.8,
 90,
 'MUSCLE BUILDING / FAT LOSS. High protein, portable and office-friendly lunch. Grilled paneer retains protein without extra calories from deep frying. Good macros for mid-cut or lean-bulk phase.'),

-- =============================================================================
-- LUNCH — Weight Loss / Fat Loss
-- =============================================================================

('Moong Dal Soup with Roti', 'lunch', '13:00',
 '[{"name":"Yellow moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Spinach, tomato, onion","caloriesKcal":40,"proteinG":2,"carbsG":7,"fatsG":0},{"name":"Cumin, turmeric, ginger","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0.2},{"name":"Whole wheat roti (1)","caloriesKcal":100,"proteinG":3.5,"carbsG":20,"fatsG":1.5}]',
 'Cook moong dal with spinach and spices until soft. Blend half for creamy texture. Serve with one roti.',
 275, 14.7, 50, 2.2,
 35,
 'WEIGHT LOSS. Very low calorie, high protein and fibre lunch. The soup volume creates satiety without high calories. Spinach adds iron and vitamins. Ideal for strict calorie deficit days.'),

('Grilled Chicken Salad (Indian Style)', 'lunch', '13:00',
 '[{"name":"Grilled chicken breast","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Cucumber, tomato, onion, lettuce","caloriesKcal":35,"proteinG":1.5,"carbsG":7,"fatsG":0.2},{"name":"Chaat masala, lemon dressing","caloriesKcal":10,"proteinG":0,"carbsG":2,"fatsG":0},{"name":"Roasted peanuts","caloriesKcal":55,"proteinG":2.5,"carbsG":2,"fatsG":4.5}]',
 'Grill seasoned chicken breast. Slice and toss with salad vegetables, peanuts and chaat-lemon dressing.',
 265, 35, 11, 8.3,
 100,
 'FAT LOSS. Very high protein, very low calorie lunch. Indian spiced salad format makes it flavourful without heavy dressing. Keeps insulin low. Excellent for strict cutting days. Pair with buttermilk for extra protein and probiotics.'),

('Vegetable Clear Soup with Brown Rice', 'lunch', '12:30',
 '[{"name":"Mixed vegetables (carrot, beans, corn, peas)","caloriesKcal":80,"proteinG":3,"carbsG":16,"fatsG":0.5},{"name":"Brown rice (small portion)","caloriesKcal":110,"proteinG":2.5,"carbsG":23,"fatsG":0.7},{"name":"Ginger, garlic, black pepper","caloriesKcal":10,"proteinG":0.3,"carbsG":2,"fatsG":0}]',
 'Simmer vegetables in water with ginger and garlic. Season with pepper and salt. Serve soup alongside small brown rice portion.',
 200, 5.8, 41, 1.2,
 30,
 'WEIGHT LOSS. Extremely low calorie, high volume meal. Vegetable broth fills the stomach without significant calories. Brown rice provides minimal complex carbs. Excellent for 1200-1400 kcal diet plans.'),

('Tinda (Apple Gourd) Sabzi with Jowar Roti', 'lunch', '13:00',
 '[{"name":"Tinda (apple gourd)","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0.3},{"name":"Onion, tomato, spices","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Jowar roti (2)","caloriesKcal":160,"proteinG":5,"carbsG":34,"fatsG":1}]',
 'Cook tinda with onion-tomato masala. Serve with freshly made jowar rotis.',
 290, 8.5, 52, 5.8,
 30,
 'WEIGHT LOSS. Tinda is one of the lowest-calorie vegetables available. Jowar roti is gluten-free with high fibre and iron. Traditional Indian weight management meal. Very filling for the calories.'),

('Lauki (Bottle Gourd) Dal', 'lunch', '13:00',
 '[{"name":"Toor dal","caloriesKcal":180,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Bottle gourd (lauki)","caloriesKcal":30,"proteinG":1,"carbsG":6,"fatsG":0.1},{"name":"Tomato, onion, cumin, turmeric","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Ghee (small)","caloriesKcal":30,"proteinG":0,"carbsG":0,"fatsG":3.3}]',
 'Pressure cook toor dal and lauki together. Temper with cumin and pour ghee tadka. Serve with rice or roti.',
 280, 14.5, 42, 4.4,
 30,
 'WEIGHT LOSS / HEALTH MAINTENANCE. Lauki is extremely low calorie (95% water) and aids kidney health. It is one of the most traditional Indian vegetables for weight management. Very easy on the digestive system.'),

-- =============================================================================
-- LUNCH — Weight Gain
-- =============================================================================

('Double Roti Chole with Butter', 'lunch', '13:30',
 '[{"name":"Chole (chickpeas cooked)","caloriesKcal":210,"proteinG":14,"carbsG":35,"fatsG":3},{"name":"White bread (3 slices) or bhatura","caloriesKcal":240,"proteinG":7,"carbsG":48,"fatsG":3},{"name":"Butter (2 tsp)","caloriesKcal":70,"proteinG":0,"carbsG":0,"fatsG":8},{"name":"Onion, lemon, green chilli","caloriesKcal":20,"proteinG":0.5,"carbsG":4,"fatsG":0}]',
 'Prepare thick spiced chole curry. Serve with bread slices and butter or freshly made bhatura.',
 540, 21.5, 87, 14,
 70,
 'WEIGHT GAIN. High calorie, high carb and protein meal. Chole is extremely nutrient dense. Butter adds healthy fat and calories. Good for underweight individuals needing calorie surplus without excessive volume eating.'),

('Mutton Rogan Josh with Naan', 'lunch', '13:30',
 '[{"name":"Mutton (bone-in)","caloriesKcal":290,"proteinG":26,"carbsG":0,"fatsG":20},{"name":"Kashmiri spice gravy","caloriesKcal":80,"proteinG":2,"carbsG":10,"fatsG":4},{"name":"Naan (2)","caloriesKcal":520,"proteinG":18,"carbsG":90,"fatsG":10}]',
 'Slow cook mutton in Kashmiri spice gravy until tender. Serve with soft naans.',
 890, 46, 100, 34,
 200,
 'WEIGHT GAIN. Very high calorie meal. Excellent for individuals recovering from illness or significantly underweight. Bone-in mutton provides collagen, marrow, zinc and B12 in addition to high protein. Weekend/occasional meal.'),

('Rice, Dal, Sabzi, Curd, Papad (Full Thali)', 'lunch', '13:00',
 '[{"name":"Steamed rice","caloriesKcal":250,"proteinG":5,"carbsG":55,"fatsG":0.5},{"name":"Toor dal","caloriesKcal":180,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Aloo gobi sabzi","caloriesKcal":130,"proteinG":3,"carbsG":20,"fatsG":4},{"name":"Curd","caloriesKcal":80,"proteinG":4,"carbsG":6,"fatsG":4},{"name":"Roasted papad (2)","caloriesKcal":50,"proteinG":2.5,"carbsG":8,"fatsG":1},{"name":"Ghee (1 tsp)","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Serve rice and dal alongside sabzi, curd, papad and a pour of ghee over rice.',
 735, 26.5, 117, 15.5,
 80,
 'WEIGHT GAIN / HEALTH MAINTENANCE. Traditional full Indian thali. Nutritionally complete and balanced. High calorie for gaining weight. Ghee aids fat-soluble vitamin absorption. Rotate sabzi daily for micronutrient variety.'),

-- =============================================================================
-- LUNCH — Health Maintenance / Leafy Vegetables
-- =============================================================================

('Sarson ka Saag with Makki Roti', 'lunch', '13:00',
 '[{"name":"Mustard greens (sarson)","caloriesKcal":50,"proteinG":4,"carbsG":7,"fatsG":0.5},{"name":"Spinach and bathua","caloriesKcal":30,"proteinG":2.5,"carbsG":4,"fatsG":0.3},{"name":"Makki (corn) roti (2)","caloriesKcal":180,"proteinG":4,"carbsG":38,"fatsG":2},{"name":"Butter (white makhan)","caloriesKcal":70,"proteinG":0,"carbsG":0,"fatsG":8},{"name":"Ginger, garlic, onion","caloriesKcal":20,"proteinG":0.5,"carbsG":4,"fatsG":0}]',
 'Slow-cook mustard greens, spinach and bathua with ginger and garlic. Blend partially. Serve with makki roti and white butter.',
 350, 11, 53, 10.8,
 50,
 'HEALTH MAINTENANCE. A Punjabi superfood meal. Mustard greens are extraordinarily rich in Vitamin K, C, A, and glucosinolates (anti-cancer compounds). Iron and folate support hair growth and red blood cell production. Seasonal winter meal.'),

('Palak Dal (Spinach Lentil)', 'lunch', '13:00',
 '[{"name":"Toor dal","caloriesKcal":180,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Spinach (palak, chopped)","caloriesKcal":25,"proteinG":2.5,"carbsG":3.5,"fatsG":0.4},{"name":"Onion, tomato, garlic, cumin","caloriesKcal":45,"proteinG":1.5,"carbsG":9,"fatsG":0.3},{"name":"Ghee tadka","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3}]',
 'Cook toor dal with spinach until soft. Temper with garlic, cumin and dry chilli in ghee.',
 495, 23, 80.5, 9.7,
 45,
 'HEALTH MAINTENANCE / HAIR CARE. Iron from both spinach and dal — excellent for anaemia prevention and hair fall control. Vitamin C in tomato increases iron absorption. Complete protein + iron + fibre in one dal. Eat daily.'),

('Methi Aloo Sabzi with Dal and Roti', 'lunch', '13:00',
 '[{"name":"Fresh methi (fenugreek) leaves","caloriesKcal":20,"proteinG":2,"carbsG":3,"fatsG":0.3},{"name":"Potato (small, cubed)","caloriesKcal":80,"proteinG":2,"carbsG":18,"fatsG":0.1},{"name":"Moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Oil, cumin, garlic","caloriesKcal":45,"proteinG":0.3,"carbsG":1,"fatsG":4.8}]',
 'Cook methi and potato together with spices. Serve alongside moong dal and rotis.',
 475, 20.3, 84, 8.7,
 40,
 'HEALTH MAINTENANCE. Methi leaves reduce bad cholesterol, improve insulin sensitivity and are deeply beneficial for hair growth due to their lecithin content. Potato adds comfort and quick energy. Classic everyday North Indian lunch.'),

('Drumstick (Moringa) Sambar with Rice', 'lunch', '13:00',
 '[{"name":"Toor dal","caloriesKcal":180,"proteinG":12,"carbsG":28,"fatsG":1},{"name":"Drumstick (moringa pods)","caloriesKcal":25,"proteinG":2,"carbsG":4,"fatsG":0.2},{"name":"Tomato, tamarind, sambar powder","caloriesKcal":40,"proteinG":1,"carbsG":8,"fatsG":0.5},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Ghee","caloriesKcal":30,"proteinG":0,"carbsG":0,"fatsG":3.3}]',
 'Make sambar with toor dal and drumstick pieces in tamarind base. Serve over rice with ghee.',
 475, 19, 84, 5.5,
 50,
 'HEALTH MAINTENANCE / HAIR CARE. Drumstick (moringa) is one of the most nutrient-dense foods on earth — rich in Vitamin A, C, iron, calcium and amino acids. Traditionally used in South Indian cooking for immunity and hair health. Eat 2-3x per week.'),

-- =============================================================================
-- DINNER — Muscle Building
-- =============================================================================

('Chicken Lentil Soup (High Protein)', 'dinner', '20:00',
 '[{"name":"Chicken (shredded, cooked)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Masoor dal (red lentils)","caloriesKcal":130,"proteinG":10,"carbsG":22,"fatsG":0.5},{"name":"Spinach, carrot, onion","caloriesKcal":45,"proteinG":2,"carbsG":8,"fatsG":0},{"name":"Ginger, garlic, cumin, black pepper","caloriesKcal":10,"proteinG":0.3,"carbsG":2,"fatsG":0}]',
 'Pressure cook chicken with lentils, vegetables and spices. Shred chicken and blend lightly for thick soup.',
 350, 43.3, 32, 4.1,
 100,
 'MUSCLE BUILDING. Extremely high protein, low carb dinner. Ideal before sleep for overnight muscle protein synthesis. Low on carbs to avoid fat storage at night. Easy to digest. Very filling.'),

('Grilled Chicken with Sauteed Vegetables and Quinoa', 'dinner', '19:30',
 '[{"name":"Chicken breast","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Quinoa (cooked)","caloriesKcal":120,"proteinG":4.5,"carbsG":21,"fatsG":2},{"name":"Broccoli, beans, capsicum","caloriesKcal":50,"proteinG":2.5,"carbsG":9,"fatsG":0.3},{"name":"Olive oil, lemon, Indian spices","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Season and grill chicken. Sauté vegetables in olive oil with Indian spices. Serve over cooked quinoa.',
 380, 38, 30, 10.9,
 150,
 'MUSCLE BUILDING / FAT LOSS. Very high protein, moderate carb, clean dinner. Quinoa provides complete plant protein alongside chicken. Lower calorie than rice-based dinners but nutritionally superior. For intermediate-advanced fitness goals.'),

('Paneer Bhurji with High-Protein Dal', 'dinner', '20:00',
 '[{"name":"Paneer","caloriesKcal":170,"proteinG":11,"carbsG":2,"fatsG":13},{"name":"Masoor dal (cooked)","caloriesKcal":130,"proteinG":10,"carbsG":22,"fatsG":0.5},{"name":"Capsicum, onion, tomato","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Scramble paneer with vegetables. Serve alongside spiced masoor dal.',
 380, 22.5, 32, 18,
 80,
 'MUSCLE BUILDING (vegetarian). Double protein source dinner — paneer + lentils. Skip roti/rice to keep carbs controlled for evening meal. Good macros for muscle building without calorie excess. Easy 20-minute dinner.'),

-- =============================================================================
-- DINNER — Weight Loss / Fat Loss
-- =============================================================================

('Vegetable Khichdi (Light Version)', 'dinner', '19:30',
 '[{"name":"Moong dal (split, no skin)","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Rice (small portion)","caloriesKcal":100,"proteinG":2,"carbsG":22,"fatsG":0.3},{"name":"Zucchini, spinach, carrot","caloriesKcal":40,"proteinG":2,"carbsG":8,"fatsG":0},{"name":"Ghee (half tsp), turmeric, ginger","caloriesKcal":25,"proteinG":0,"carbsG":0.5,"fatsG":2.5}]',
 'Pressure cook moong dal and small rice portion with chopped vegetables. Add minimal ghee and turmeric.',
 295, 13, 52.5, 3.3,
 35,
 'WEIGHT LOSS. Light, gut-friendly dinner. One of Ayurveda''s most recommended meals for healthy digestion and weight management. Very easy to digest before sleep. Low calorie and balanced.'),

('Grilled Fish Tikka with Raita', 'dinner', '19:30',
 '[{"name":"Fish fillet (surmai/rohu)","caloriesKcal":120,"proteinG":26,"carbsG":0,"fatsG":2},{"name":"Tikka marinade (yoghurt, spices)","caloriesKcal":40,"proteinG":2.5,"carbsG":3,"fatsG":1.5},{"name":"Onion raita","caloriesKcal":70,"proteinG":4,"carbsG":6,"fatsG":3},{"name":"Mint-coriander chutney","caloriesKcal":15,"proteinG":0.5,"carbsG":2.5,"fatsG":0.3}]',
 'Marinate fish in tikka spices and grill or bake. Serve with raita and chutney.',
 245, 33, 11.5, 6.8,
 110,
 'FAT LOSS. Very high protein, very low calorie, no grain dinner. Ideal for strict fat loss phases. Keeps you full overnight without heavy carbs. Omega-3 from fish improves insulin sensitivity and reduces inflammation.'),

('Tofu Palak Curry (No Roti)', 'dinner', '20:00',
 '[{"name":"Firm tofu","caloriesKcal":145,"proteinG":15,"carbsG":3,"fatsG":8},{"name":"Spinach puree (thick)","caloriesKcal":30,"proteinG":3,"carbsG":4.5,"fatsG":0.5},{"name":"Onion, ginger, garlic, tomato","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Oil (minimal)","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2}]',
 'Blend spinach, fry tofu cubes. Combine in spinach gravy with spices. Serve as-is without grains.',
 235, 19.5, 15.5, 10.7,
 70,
 'FAT LOSS / WEIGHT LOSS (vegan-friendly). Very low carb, high protein dinner. Tofu provides plant-based complete protein; spinach is extremely nutrient dense per calorie. Skip roti for strict low-carb dinner. Excellent for fat loss and hair health.'),

('Egg Drop Rasam', 'dinner', '19:30',
 '[{"name":"Eggs (2, beaten)","caloriesKcal":140,"proteinG":12,"carbsG":1,"fatsG":9},{"name":"Tomato rasam base (thin)","caloriesKcal":50,"proteinG":1.5,"carbsG":9,"fatsG":0.5},{"name":"Pepper, cumin, curry leaves","caloriesKcal":8,"proteinG":0.3,"carbsG":1.5,"fatsG":0.2}]',
 'Prepare spiced tomato rasam. Beat eggs and drizzle slowly into simmering rasam, stirring gently. Serve hot.',
 198, 13.8, 11.5, 9.7,
 30,
 'WEIGHT LOSS / FAT LOSS. Innovative South Indian style soup-dinner. Very low calorie, high protein. Pepper and rasam spices boost metabolism. Extremely light before sleep. Great for strict diet days.'),

-- =============================================================================
-- DINNER — Weight Gain
-- =============================================================================

('Butter Chicken with Garlic Naan', 'dinner', '20:30',
 '[{"name":"Chicken (boneless)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Butter-cream tomato sauce","caloriesKcal":150,"proteinG":2,"carbsG":8,"fatsG":13},{"name":"Garlic naan (2)","caloriesKcal":520,"proteinG":16,"carbsG":90,"fatsG":10}]',
 'Cook chicken in rich butter-cream tomato sauce. Serve with soft garlic naans.',
 835, 49, 98, 26.6,
 160,
 'WEIGHT GAIN. Very high calorie, high protein dinner. Excellent for hardgainers and bulking phase. Butter and cream provide calorie-dense healthy fats. Occasional meal — not for daily consumption. Best for rest days or post-heavy training.'),

('Aloo Paneer Paratha with Lassi', 'dinner', '20:00',
 '[{"name":"Whole wheat flour","caloriesKcal":180,"proteinG":6,"carbsG":36,"fatsG":1},{"name":"Potato and paneer filling","caloriesKcal":200,"proteinG":8,"carbsG":20,"fatsG":10},{"name":"Ghee (for cooking)","caloriesKcal":90,"proteinG":0,"carbsG":0,"fatsG":10},{"name":"Sweet lassi (full fat)","caloriesKcal":200,"proteinG":7,"carbsG":28,"fatsG":7}]',
 'Prepare parathas stuffed with spiced potato and paneer mix. Cook with ghee. Serve with sweet lassi.',
 670, 21, 84, 28,
 70,
 'WEIGHT GAIN. Traditional high-calorie Indian dinner. Paneer adds protein to typical paratha. Sweet lassi adds easily consumable liquid calories and protein. Great for post-workout dinner when appetite is high.'),

-- =============================================================================
-- DINNER — Health Maintenance / Leafy Vegetables
-- =============================================================================

('Amaranth (Chaulai) Sabzi with Bajra Roti', 'dinner', '19:30',
 '[{"name":"Amaranth leaves (chaulai)","caloriesKcal":35,"proteinG":3.5,"carbsG":5,"fatsG":0.5},{"name":"Garlic, oil, dry red chilli","caloriesKcal":50,"proteinG":0.3,"carbsG":1,"fatsG":5},{"name":"Bajra roti (2)","caloriesKcal":160,"proteinG":5,"carbsG":32,"fatsG":2}]',
 'Sauté garlic in oil, add washed amaranth leaves. Cook until wilted. Season. Serve with bajra rotis.',
 245, 8.8, 38, 7.5,
 30,
 'HEALTH MAINTENANCE / HAIR CARE. Amaranth leaves are extraordinarily high in iron and calcium — among the richest plant sources available. Bajra (pearl millet) is rich in silica which strengthens hair shaft. Together an exceptional hair-health dinner. Very low calorie and traditional.'),

('Fenugreek Leaves (Methi) Dal', 'dinner', '20:00',
 '[{"name":"Chana dal","caloriesKcal":170,"proteinG":11,"carbsG":28,"fatsG":1},{"name":"Fresh methi leaves","caloriesKcal":20,"proteinG":2,"carbsG":3,"fatsG":0.3},{"name":"Tomato, onion, garlic","caloriesKcal":45,"proteinG":1.5,"carbsG":9,"fatsG":0},{"name":"Ghee tadka","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5},{"name":"Roti (1)","caloriesKcal":100,"proteinG":3.5,"carbsG":20,"fatsG":1.5}]',
 'Cook chana dal. Add methi leaves in last 10 minutes of cooking. Finish with ghee tadka.',
 380, 18, 60, 7.8,
 35,
 'HEALTH MAINTENANCE. Methi dal is deeply nourishing. Fenugreek leaves improve insulin sensitivity, lower bad cholesterol, and provide iron and folate. Chana dal is slower digesting than other lentils — good before sleep. Traditional and medicinal.'),

('Bhindi (Okra) Stir Fry with Jowar Roti', 'dinner', '20:00',
 '[{"name":"Okra (bhindi)","caloriesKcal":55,"proteinG":2,"carbsG":10,"fatsG":0.3},{"name":"Onion, tomato, cumin seeds","caloriesKcal":35,"proteinG":1.2,"carbsG":7,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Jowar roti (2)","caloriesKcal":160,"proteinG":5,"carbsG":34,"fatsG":1}]',
 'Stir-fry sliced okra until crisp and golden. Add spices and onion. Serve with jowar rotis.',
 290, 8.2, 51, 5.8,
 30,
 'HEALTH MAINTENANCE / WEIGHT LOSS. Bhindi is extremely rich in soluble fibre (mucilage) which feeds beneficial gut bacteria and slows carbohydrate absorption. Also rich in Vitamin C and folate. Jowar roti is gluten-free and high in iron. Low calorie combination.'),

-- =============================================================================
-- SNACK — Muscle Building
-- =============================================================================

('Boiled Eggs with Chaat Masala', 'snack', '16:00',
 '[{"name":"Boiled eggs (3)","caloriesKcal":210,"proteinG":18,"carbsG":1.5,"fatsG":14},{"name":"Chaat masala, black salt, lemon","caloriesKcal":5,"proteinG":0,"carbsG":1,"fatsG":0}]',
 'Hard boil eggs. Peel and halve. Season with chaat masala, black salt and lemon.',
 215, 18, 2.5, 14,
 30,
 'MUSCLE BUILDING. Quick, high-protein, portable snack. Eggs are the gold standard complete protein. Zero cooking skill required after boiling. Perfect between-meal muscle-building snack. Affordable.'),

('Paneer Cubes with Herbs', 'snack', '16:30',
 '[{"name":"Raw paneer (cubed)","caloriesKcal":200,"proteinG":13,"carbsG":3,"fatsG":15},{"name":"Chaat masala, black pepper, lime","caloriesKcal":5,"proteinG":0,"carbsG":1,"fatsG":0}]',
 'Cube fresh paneer. Season with chaat masala, cracked pepper and a squeeze of lime. Eat cold.',
 205, 13, 4, 15,
 50,
 'MUSCLE BUILDING (vegetarian). Simple, very high protein snack. Raw paneer retains all protein without added cooking calories. Excellent for vegetarian gym-goers needing frequent protein intake through the day.'),

('Chana Dal Chaat', 'snack', '16:00',
 '[{"name":"Boiled chana dal","caloriesKcal":170,"proteinG":11,"carbsG":28,"fatsG":1},{"name":"Onion, tomato, green chilli, coriander","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Chaat masala, lemon juice","caloriesKcal":5,"proteinG":0,"carbsG":1,"fatsG":0}]',
 'Boil chana dal until just cooked (not mushy). Mix with raw vegetables and season with chaat masala.',
 200, 12, 34, 1,
 20,
 'MUSCLE BUILDING / WEIGHT MANAGEMENT. Very high protein, high fibre snack. Chana dal has a lower glycaemic index than other dals. Keeps appetite suppressed for 3+ hours. Inexpensive and very satisfying.'),

('Peanut Butter with Apple Slices', 'snack', '16:00',
 '[{"name":"Peanut butter (2 tbsp)","caloriesKcal":190,"proteinG":8,"carbsG":6,"fatsG":16},{"name":"Apple (1 medium)","caloriesKcal":95,"proteinG":0.5,"carbsG":25,"fatsG":0.3}]',
 'Core and slice apple. Serve with peanut butter for dipping.',
 285, 8.5, 31, 16.3,
 45,
 'MUSCLE BUILDING / WEIGHT GAIN. Classic combination. Peanut butter provides protein and healthy fats; apple provides fast carbs and fibre. Good between lunch and dinner for maintaining anabolic state. Portable for office snacking.'),

-- =============================================================================
-- SNACK — Weight Loss / Fat Loss
-- =============================================================================

('Cucumber and Tomato Chaat', 'snack', '16:00',
 '[{"name":"Cucumber (large, sliced)","caloriesKcal":25,"proteinG":1.1,"carbsG":5,"fatsG":0.2},{"name":"Tomato (2)","caloriesKcal":35,"proteinG":1.5,"carbsG":7,"fatsG":0.3},{"name":"Onion, coriander, chaat masala, lemon","caloriesKcal":15,"proteinG":0.5,"carbsG":3,"fatsG":0}]',
 'Slice cucumber and tomato. Toss with raw onion rings, coriander and chaat masala dressing.',
 75, 3.1, 15, 0.5,
 15,
 'FAT LOSS. One of the lowest calorie snacks possible. Very high volume for the calorie count. Hydrating and full of fibre. Use when hunger spikes between meals during a calorie deficit. Zero guilt snack.'),

('Moong Dal Bhel', 'snack', '16:00',
 '[{"name":"Boiled moong dal","caloriesKcal":80,"proteinG":6,"carbsG":14,"fatsG":0.3},{"name":"Puffed rice (murmura)","caloriesKcal":60,"proteinG":1.5,"carbsG":13,"fatsG":0.3},{"name":"Cucumber, tomato, onion","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Green chutney, tamarind chutney","caloriesKcal":20,"proteinG":0.5,"carbsG":4,"fatsG":0}]',
 'Mix boiled moong with puffed rice and vegetables. Drizzle both chutneys. Toss and serve immediately.',
 185, 9, 36, 0.6,
 20,
 'WEIGHT LOSS. Low calorie, high fibre, high protein snack. Puffed rice adds crunch without calories. Moong provides protein to stave off hunger. Much healthier than typical bhel with sev.'),

('Roasted Foxnuts (Makhana) with Herbs', 'snack', '17:00',
 '[{"name":"Makhana (lotus seeds)","caloriesKcal":100,"proteinG":4,"carbsG":20,"fatsG":0.5},{"name":"Ghee (minimal, 1/4 tsp)","caloriesKcal":10,"proteinG":0,"carbsG":0,"fatsG":1.1},{"name":"Turmeric, black pepper, rock salt","caloriesKcal":3,"proteinG":0.1,"carbsG":0.7,"fatsG":0}]',
 'Roast makhana dry or with tiny ghee until crispy. Season generously with turmeric-pepper mix.',
 113, 4.1, 20.7, 1.6,
 40,
 'WEIGHT LOSS / HEALTH MAINTENANCE. Makhana is low calorie, high magnesium, anti-inflammatory. Turmeric and black pepper combination is anti-inflammatory and aids metabolism. Good for evening snacking. Suitable for diabetics.'),

('Amla (Indian Gooseberry) Murabba', 'snack', '16:00',
 '[{"name":"Amla (whole, preserved in honey)","caloriesKcal":80,"proteinG":0.5,"carbsG":20,"fatsG":0.1}]',
 'Eat 2-3 preserved amla pieces or 1 fresh amla with a pinch of rock salt.',
 80, 0.5, 20, 0.1,
 15,
 'HEALTH MAINTENANCE / HAIR CARE. Amla is the richest known natural source of Vitamin C — essential for collagen production and hair strength. A single amla provides 20x more Vitamin C than an orange. Improves immunity and skin elasticity. Traditional snack with no negatives.'),

-- =============================================================================
-- SNACK — Weight Gain
-- =============================================================================

('Mixed Dry Fruit and Nut Trail Mix', 'snack', '16:00',
 '[{"name":"Almonds","caloriesKcal":80,"proteinG":3,"carbsG":3,"fatsG":7},{"name":"Cashews","caloriesKcal":80,"proteinG":2.5,"carbsG":5,"fatsG":6},{"name":"Raisins","caloriesKcal":85,"proteinG":0.8,"carbsG":22,"fatsG":0.1},{"name":"Walnuts","caloriesKcal":90,"proteinG":2,"carbsG":2,"fatsG":9},{"name":"Dates (2)","caloriesKcal":60,"proteinG":0.5,"carbsG":16,"fatsG":0.1}]',
 'Combine all dry fruits and nuts. Portion into small bags for convenience.',
 395, 8.8, 48, 22.2,
 80,
 'WEIGHT GAIN. Calorie-dense, nutrient-rich snack. Excellent for increasing daily calorie intake without eating large volumes of food. Walnuts provide omega-3; almonds provide vitamin E. Great for underweight individuals and hardgainers.'),

('Chikki (Peanut Jaggery Bar)', 'snack', '16:30',
 '[{"name":"Roasted peanuts","caloriesKcal":180,"proteinG":8,"carbsG":6,"fatsG":15},{"name":"Jaggery","caloriesKcal":90,"proteinG":0.2,"carbsG":23,"fatsG":0}]',
 'Melt jaggery, mix in peanuts, press into tray and cut into bars when cooled.',
 270, 8.2, 29, 15,
 20,
 'WEIGHT GAIN. Traditional Indian high-calorie sweet snack. Jaggery provides iron and quick carbs; peanuts provide protein and fat. Perfect post-workout weight gain snack. Very affordable. Healthier than commercial energy bars.'),

('Lassi (Full Fat, Sweet)', 'snack', '16:00',
 '[{"name":"Full fat curd","caloriesKcal":120,"proteinG":6,"carbsG":9,"fatsG":6},{"name":"Milk","caloriesKcal":75,"proteinG":4,"carbsG":6,"fatsG":4},{"name":"Sugar/jaggery","caloriesKcal":60,"proteinG":0,"carbsG":15,"fatsG":0},{"name":"Cardamom","caloriesKcal":3,"proteinG":0.1,"carbsG":0.7,"fatsG":0}]',
 'Blend curd with milk, sugar and cardamom. Serve chilled.',
 258, 10.1, 30.7, 10,
 25,
 'WEIGHT GAIN. Calorie and protein-dense liquid snack. Easy to consume when appetite is low. Probiotics from curd aid digestion. Traditional weight gain drink in North India. Can add protein powder for enhanced muscle-building version.'),

-- =============================================================================
-- JUICE — Health Maintenance / Hair Care
-- =============================================================================

('Amla Ginger Turmeric Juice', 'snack', '07:00',
 '[{"name":"Amla (fresh or juice)","caloriesKcal":30,"proteinG":0.5,"carbsG":7,"fatsG":0.1},{"name":"Ginger (1 inch piece)","caloriesKcal":8,"proteinG":0.2,"carbsG":2,"fatsG":0.1},{"name":"Turmeric (1/2 tsp)","caloriesKcal":4,"proteinG":0.1,"carbsG":0.8,"fatsG":0.1},{"name":"Water and black pepper","caloriesKcal":2,"proteinG":0,"carbsG":0.4,"fatsG":0}]',
 'Blend or juice amla with ginger. Mix in turmeric and black pepper. Drink fresh on empty stomach.',
 44, 0.8, 10.2, 0.3,
 20,
 'HAIR CARE / HEALTH MAINTENANCE / IMMUNITY. This juice is possibly the most powerful hair and immunity tonic in Indian tradition. Amla provides Vitamin C for collagen and keratin; turmeric is anti-inflammatory; ginger aids circulation to scalp. Drink daily on empty stomach for best results.'),

('Spinach Cucumber Mint Green Juice', 'snack', '07:30',
 '[{"name":"Spinach (handful)","caloriesKcal":20,"proteinG":2,"carbsG":3,"fatsG":0.3},{"name":"Cucumber","caloriesKcal":16,"proteinG":0.7,"carbsG":3,"fatsG":0.1},{"name":"Mint leaves","caloriesKcal":5,"proteinG":0.3,"carbsG":0.9,"fatsG":0.1},{"name":"Lemon juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0},{"name":"Ginger, water","caloriesKcal":5,"proteinG":0.1,"carbsG":1,"fatsG":0}]',
 'Blend all ingredients with water. Strain and drink fresh.',
 54, 3.2, 9.9, 0.5,
 25,
 'HAIR CARE / FAT LOSS / DETOX. Extremely low calorie, high micronutrient juice. Spinach provides iron and folate for hair follicle health. Cucumber hydrates hair and scalp. Mint improves blood circulation to scalp. Excellent morning ritual for hair fall reduction.'),

('Carrot Beetroot Ginger Juice', 'snack', '07:00',
 '[{"name":"Carrot (2)","caloriesKcal":50,"proteinG":1.1,"carbsG":12,"fatsG":0.3},{"name":"Beetroot (1 medium)","caloriesKcal":44,"proteinG":1.7,"carbsG":10,"fatsG":0.2},{"name":"Ginger","caloriesKcal":8,"proteinG":0.2,"carbsG":2,"fatsG":0.1},{"name":"Lemon juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0}]',
 'Juice carrots and beetroot. Add ginger and lemon. Drink immediately for maximum nutrient retention.',
 110, 3.1, 26, 0.6,
 30,
 'HEALTH MAINTENANCE / HAIR CARE / FAT LOSS. Beetroot is rich in nitrates which improve blood flow — including to scalp for hair growth. Beta-carotene in carrots converts to Vitamin A which is essential for healthy sebum production on scalp. Iron from beetroot prevents anaemia-related hair fall. Excellent morning juice.'),

('Coconut Water with Lemon and Mint', 'snack', '16:00',
 '[{"name":"Fresh coconut water","caloriesKcal":45,"proteinG":0.5,"carbsG":9,"fatsG":0.5},{"name":"Lemon juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0},{"name":"Mint leaves","caloriesKcal":3,"proteinG":0.2,"carbsG":0.5,"fatsG":0}]',
 'Mix fresh coconut water with lemon juice and crushed mint. Serve chilled.',
 56, 0.8, 11.5, 0.5,
 25,
 'HEALTH MAINTENANCE / POST-WORKOUT. Natural electrolyte drink — rich in potassium, sodium, magnesium. Excellent for hydration, preventing muscle cramps and reducing heat in the body. Low calorie and gut-friendly. Great for hot Hyderabad weather.'),

('Pomegranate Aloe Vera Juice', 'snack', '08:00',
 '[{"name":"Pomegranate seeds (juiced)","caloriesKcal":80,"proteinG":1.5,"carbsG":18,"fatsG":1},{"name":"Aloe vera gel (1 tbsp)","caloriesKcal":5,"proteinG":0.1,"carbsG":1,"fatsG":0},{"name":"Water, pinch of black salt","caloriesKcal":2,"proteinG":0,"carbsG":0.3,"fatsG":0}]',
 'Juice pomegranate. Mix in aloe vera gel and a pinch of black salt.',
 87, 1.6, 19.3, 1,
 40,
 'HAIR CARE / SKIN HEALTH. Pomegranate is rich in punicalagins which protect hair follicles from oxidative stress. Aloe vera has proteolytic enzymes that repair dead scalp cells. Together they improve scalp health, reduce dandruff and support hair growth from within. Drink 3-4x per week.'),

('Jeera (Cumin) Lemon Water', 'snack', '06:30',
 '[{"name":"Cumin seeds (1 tsp, roasted and ground)","caloriesKcal":8,"proteinG":0.4,"carbsG":1,"fatsG":0.4},{"name":"Lemon juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0},{"name":"Warm water","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0},{"name":"Honey (optional, 1 tsp)","caloriesKcal":22,"proteinG":0,"carbsG":6,"fatsG":0}]',
 'Boil cumin seeds in water for 5 minutes. Strain, add lemon juice and optional honey. Drink warm.',
 38, 0.5, 9, 0.4,
 10,
 'WEIGHT LOSS / HEALTH MAINTENANCE / DETOX. Jeera water on empty stomach is one of the most widely recommended home remedies in India for bloating, digestion, and metabolism boost. Lemon alkalises the body and provides Vitamin C. Very low calorie. Drink before breakfast daily.'),

('Ash Gourd (Winter Melon) Juice', 'snack', '07:00',
 '[{"name":"Ash gourd (petha, fresh)","caloriesKcal":18,"proteinG":0.7,"carbsG":4,"fatsG":0.1},{"name":"Ginger, mint, lemon","caloriesKcal":12,"proteinG":0.3,"carbsG":3,"fatsG":0.1}]',
 'Juice raw ash gourd with ginger and mint. Add lemon juice and drink fresh.',
 30, 1, 7, 0.2,
 20,
 'HEALTH MAINTENANCE / WEIGHT LOSS / AYURVEDIC. Ash gourd juice is one of the most cooling and alkalising drinks in Ayurveda. Extremely low calorie. Said to improve mental clarity, reduce acidity, and assist in weight management. Best consumed on empty stomach.'),

('Moringa (Drumstick Leaves) Juice', 'snack', '07:00',
 '[{"name":"Fresh moringa leaves","caloriesKcal":20,"proteinG":2,"carbsG":3,"fatsG":0.3},{"name":"Lemon juice, black pepper, honey","caloriesKcal":30,"proteinG":0.1,"carbsG":8,"fatsG":0}]',
 'Blend or crush moringa leaves with water. Strain. Add lemon, black pepper and honey.',
 50, 2.1, 11, 0.3,
 25,
 'HEALTH MAINTENANCE / HAIR CARE / NUTRITION. Moringa leaves have 7x the Vitamin C of oranges, 4x the calcium of milk, and 2x the protein of yoghurt. Rich in all essential amino acids. Extremely beneficial for hair growth, energy and immunity. Called a superfood worldwide; available as street food in South India.'),

('Sugarcane Ginger Juice', 'snack', '16:00',
 '[{"name":"Fresh sugarcane juice","caloriesKcal":110,"proteinG":0.2,"carbsG":27,"fatsG":0.3},{"name":"Ginger (fresh)","caloriesKcal":5,"proteinG":0.1,"carbsG":1.2,"fatsG":0},{"name":"Lemon juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0}]',
 'Extract fresh sugarcane juice at the press. Mix in ginger juice and lemon.',
 123, 0.4, 30.2, 0.3,
 15,
 'WEIGHT GAIN / PRE-WORKOUT / ENERGY. Natural fast-acting carbohydrate source. Very popular pre-workout or post-workout drink in Indian street culture. Provides instant glycogen. Rich in iron, potassium and natural enzymes. Not suitable for diabetics or fat loss phases.'),

-- =============================================================================
-- PRE-WORKOUT
-- =============================================================================

('Banana with Milk', 'pre-workout', '06:30',
 '[{"name":"Banana (1)","caloriesKcal":90,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"name":"Full fat milk (1 glass)","caloriesKcal":150,"proteinG":8,"carbsG":12,"fatsG":8}]',
 'Eat banana followed immediately by a glass of warm milk.',
 240, 9.1, 35, 8.3,
 25,
 'PRE-WORKOUT / MUSCLE BUILDING. Simple, traditional Indian pre-workout. Banana provides fast carbs for energy; milk provides casein protein which is slow-releasing — keeps amino acids available during the workout. Eat 30-45 minutes before training.'),

('Poha with Roasted Peanuts (Light)', 'pre-workout', '06:45',
 '[{"name":"Poha (light portion)","caloriesKcal":130,"proteinG":2,"carbsG":26,"fatsG":0.5},{"name":"Roasted peanuts","caloriesKcal":80,"proteinG":4,"carbsG":3,"fatsG":6.5},{"name":"Lemon, curry leaves","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0}]',
 'Make a light portion of poha. Top with roasted peanuts and lemon.',
 215, 6.2, 30, 7,
 25,
 'PRE-WORKOUT. Light on the stomach, sufficient carbs for moderate training. Peanuts slow digestion to extend energy. Good for morning workouts when a heavy meal causes discomfort. Eat 30 minutes before.'),

('Ragi (Finger Millet) Energy Balls', 'pre-workout', '06:30',
 '[{"name":"Ragi flour","caloriesKcal":110,"proteinG":3,"carbsG":23,"fatsG":0.5},{"name":"Jaggery","caloriesKcal":60,"proteinG":0.1,"carbsG":15,"fatsG":0},{"name":"Ghee (minimal)","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2},{"name":"Sesame seeds","caloriesKcal":30,"proteinG":1.5,"carbsG":1.5,"fatsG":2.5}]',
 'Mix roasted ragi with melted jaggery and ghee. Roll into balls. Can be made in advance.',
 220, 4.6, 39.5, 5.2,
 25,
 'PRE-WORKOUT. Traditional South Indian energy food. Ragi is slow-releasing complex carbohydrate — provides sustained energy throughout workout. Jaggery provides iron and quick-acting energy spike. Portable and storable for 3-4 days.'),

('Curd with Flattened Rice (Dahi Poha)', 'pre-workout', '07:00',
 '[{"name":"Poha (small portion, soaked)","caloriesKcal":130,"proteinG":2,"carbsG":26,"fatsG":0.5},{"name":"Curd","caloriesKcal":80,"proteinG":4,"carbsG":6,"fatsG":4},{"name":"Sugar/jaggery (pinch)","caloriesKcal":20,"proteinG":0,"carbsG":5,"fatsG":0}]',
 'Soak poha briefly. Mix with curd and a small pinch of sugar.',
 230, 6, 37, 4.5,
 20,
 'PRE-WORKOUT. Traditional pre-workout meal popular in Maharashtra and Gujarat. Easy to digest, not heavy on stomach. Curd protein sustains muscle; poha carbs fuel the workout. Ideal for those who cannot eat heavy before exercise.'),

('Moong Dal Chilla (Small, Pre-Workout)', 'pre-workout', '06:45',
 '[{"name":"Moong dal batter (1 chilla)","caloriesKcal":90,"proteinG":7,"carbsG":15,"fatsG":1.5},{"name":"Ginger, green chilli, coriander","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0}]',
 'Cook one thin moong dal chilla. Eat with a glass of water.',
 95, 7.2, 16, 1.5,
 15,
 'PRE-WORKOUT (light). Minimal calorie, high protein, light on stomach. Ideal when working out within 30 minutes of waking. Provides amino acids without bloating. Good for fasted-state training with minimal fuel.'),

-- =============================================================================
-- POST-WORKOUT
-- =============================================================================

('Soya Milk with Banana Smoothie', 'post-workout', '09:00',
 '[{"name":"Soya milk (unsweetened)","caloriesKcal":100,"proteinG":7,"carbsG":8,"fatsG":4},{"name":"Banana (1)","caloriesKcal":90,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"name":"Chia seeds (1 tsp)","caloriesKcal":25,"proteinG":0.8,"carbsG":2,"fatsG":1.5},{"name":"Honey (1 tsp)","caloriesKcal":22,"proteinG":0,"carbsG":6,"fatsG":0}]',
 'Blend soya milk, banana and chia seeds. Drizzle honey.',
 237, 8.9, 39, 5.8,
 45,
 'POST-WORKOUT (vegetarian). Soya milk provides complete plant protein; banana replenishes glycogen; chia adds omega-3 for recovery. Quick to prepare and easy to drink post-workout when appetite is suppressed. Suitable for lactose-intolerant individuals.'),

('Rajma Rice (Post-Workout Bulk)', 'post-workout', '09:30',
 '[{"name":"Kidney beans (rajma)","caloriesKcal":200,"proteinG":14,"carbsG":36,"fatsG":1},{"name":"Steamed white rice","caloriesKcal":250,"proteinG":5,"carbsG":55,"fatsG":0.5},{"name":"Onion-tomato gravy","caloriesKcal":60,"proteinG":2,"carbsG":10,"fatsG":2},{"name":"Ghee (1 tsp)","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Serve thick rajma curry over hot white rice. Add ghee on top.',
 555, 21, 101, 8.5,
 65,
 'POST-WORKOUT / MUSCLE BUILDING. High protein, very high carb meal. White rice post-workout is ideal — its high glycaemic index rapidly replenishes muscle glycogen. Rajma provides slow-digesting plant protein. Excellent for evening post-workout meal for muscle gain.'),

('Dal Khichdi with Boiled Egg', 'post-workout', '09:00',
 '[{"name":"Moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Rice","caloriesKcal":150,"proteinG":3,"carbsG":33,"fatsG":0.3},{"name":"Boiled egg (2)","caloriesKcal":140,"proteinG":12,"carbsG":1,"fatsG":9},{"name":"Ghee, turmeric, cumin","caloriesKcal":50,"proteinG":0.2,"carbsG":1,"fatsG":5.5}]',
 'Make simple dal khichdi. Serve with 2 boiled eggs on the side.',
 470, 24.2, 57, 15.3,
 55,
 'POST-WORKOUT. Khichdi alone is incomplete in protein — adding eggs bridges this gap. Gentle on digestive system post-training. Good protein-to-carb ratio for recovery. Suitable for morning or afternoon training sessions.'),

('Tuna (or Canned Fish) with Chapati', 'post-workout', '09:00',
 '[{"name":"Canned tuna or sardines","caloriesKcal":130,"proteinG":28,"carbsG":0,"fatsG":2},{"name":"Whole wheat chapati (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Onion, tomato, lemon","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0}]',
 'Mix tuna with onion, tomato and lemon. Serve as filling with chapati or roll it inside.',
 355, 36, 45, 5,
 90,
 'POST-WORKOUT / MUSCLE BUILDING. Very high protein, lean post-workout meal. Canned fish is one of the most cost-effective protein sources in India. Omega-3 in tuna/sardines reduces exercise-induced inflammation. Chapati replenishes glycogen. Excellent for lean bulking.'),

('Sprouted Lentil Salad with Boiled Chicken', 'post-workout', '09:30',
 '[{"name":"Boiled chicken (shredded)","caloriesKcal":165,"proteinG":31,"carbsG":0,"fatsG":3.6},{"name":"Mixed sprouts","caloriesKcal":80,"proteinG":7,"carbsG":14,"fatsG":0.5},{"name":"Cucumber, tomato, onion","caloriesKcal":25,"proteinG":1,"carbsG":5,"fatsG":0},{"name":"Lemon, chaat masala","caloriesKcal":10,"proteinG":0,"carbsG":2,"fatsG":0}]',
 'Shred boiled chicken. Toss with sprouts and raw vegetables. Season with lemon and chaat masala.',
 280, 39, 21, 4.1,
 95,
 'POST-WORKOUT / FAT LOSS. Very high protein, very low calorie, low carb post-workout meal. Best for fat loss phases where carb restriction is maintained. Sprouts provide plant protein and live enzymes which speed recovery.'),

-- =============================================================================
-- ADDITIONAL BREAKFAST — Regional Indian
-- =============================================================================

('Uttapam with Coconut Chutney', 'breakfast', '08:30',
 '[{"name":"Idli batter (thick)","caloriesKcal":180,"proteinG":5,"carbsG":34,"fatsG":1},{"name":"Onion, tomato, chilli topping","caloriesKcal":30,"proteinG":1,"carbsG":6,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Coconut chutney","caloriesKcal":60,"proteinG":1,"carbsG":3,"fatsG":5}]',
 'Pour thick idli batter on hot tawa. Press vegetables on top while cooking. Serve with chutney.',
 310, 7, 43, 10.5,
 40,
 'HEALTH MAINTENANCE. Fermented batter provides probiotics. More filling than plain dosa due to thickness. Good for all age groups. Versatile vegetable toppings add micronutrients.'),

('Pesarattu (Green Moong Dosa)', 'breakfast', '08:00',
 '[{"name":"Whole green moong (soaked)","caloriesKcal":165,"proteinG":13,"carbsG":28,"fatsG":1},{"name":"Ginger, green chilli, cumin","caloriesKcal":8,"proteinG":0.3,"carbsG":1.5,"fatsG":0.1},{"name":"Onion (for topping)","caloriesKcal":15,"proteinG":0.4,"carbsG":3.5,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Blend soaked moong with ginger and green chilli. Spread into thin dosas. Top with onion and serve with chutney.',
 228, 13.7, 33, 5.6,
 30,
 'MUSCLE BUILDING / HEALTH MAINTENANCE. Andhra/Telugu breakfast. Unlike rice dosas, pesarattu is made entirely from whole green moong — extremely high protein and fibre. One of the healthiest dosas in Indian cuisine. High in iron and folate.'),

('Akki Roti (Rice Flour Flatbread)', 'breakfast', '08:30',
 '[{"name":"Rice flour","caloriesKcal":170,"proteinG":3,"carbsG":37,"fatsG":0.5},{"name":"Onion, carrot, dill leaves","caloriesKcal":30,"proteinG":1.2,"carbsG":6,"fatsG":0},{"name":"Coconut (grated)","caloriesKcal":40,"proteinG":0.5,"carbsG":1.5,"fatsG":3.8},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Mix rice flour with vegetables and coconut. Press thin on tawa and cook until crisp.',
 280, 4.7, 44.5, 8.8,
 25,
 'HEALTH MAINTENANCE. Karnataka breakfast. Gluten-free. Dill leaves are excellent for digestion and have anti-inflammatory properties. Coconut adds medium-chain triglycerides. Traditional and regional — good for micronutrient diversity.'),

('Thepla (Gujarati Flatbread)', 'breakfast', '08:30',
 '[{"name":"Whole wheat flour","caloriesKcal":180,"proteinG":6,"carbsG":36,"fatsG":1},{"name":"Methi leaves","caloriesKcal":15,"proteinG":1.5,"carbsG":2.5,"fatsG":0.3},{"name":"Curd (in dough)","caloriesKcal":40,"proteinG":2.5,"carbsG":3.5,"fatsG":2},{"name":"Ajwain, turmeric, chilli","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5}]',
 'Knead all ingredients into soft dough using curd for binding. Roll thin and cook.',
 280, 10.2, 43, 7.8,
 30,
 'HEALTH MAINTENANCE. Versatile, portable Gujarati flatbread. Stays fresh 3-4 days — great for meal prep. Methi and ajwain aid digestion. Curd in dough improves texture and adds probiotics.'),

-- =============================================================================
-- ADDITIONAL LUNCH — Regional and Varied
-- =============================================================================

('Kootu (South Indian Vegetable Lentil)', 'lunch', '13:00',
 '[{"name":"Chana dal","caloriesKcal":170,"proteinG":11,"carbsG":28,"fatsG":1},{"name":"Raw banana or yam","caloriesKcal":90,"proteinG":1.5,"carbsG":20,"fatsG":0.3},{"name":"Coconut paste","caloriesKcal":80,"proteinG":1,"carbsG":3,"fatsG":7},{"name":"Cumin, pepper, curry leaves, oil","caloriesKcal":50,"proteinG":0.3,"carbsG":1,"fatsG":5}]',
 'Cook dal and vegetable together. Grind coconut with cumin and pepper. Combine and temper.',
 390, 13.8, 52, 13.3,
 40,
 'HEALTH MAINTENANCE. Tamil Nadu staple. Provides protein, complex carbs and medium-chain fats from coconut. Raw banana (or yam) is rich in resistant starch which feeds gut bacteria. Excellent for digestive health.'),

('Pav Bhaji (Healthy Version)', 'lunch', '13:00',
 '[{"name":"Mixed vegetables (cauliflower, potato, peas, capsicum)","caloriesKcal":150,"proteinG":5,"carbsG":30,"fatsG":2},{"name":"Butter (minimal)","caloriesKcal":35,"proteinG":0,"carbsG":0,"fatsG":4},{"name":"Whole wheat pav (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3}]',
 'Cook all vegetables in tomato-based masala with minimal butter. Serve with whole wheat pav.',
 385, 12, 70, 9,
 60,
 'HEALTH MAINTENANCE. Popular Mumbai meal made healthier by using minimal butter and whole wheat bread. Loaded with vegetables. Good for days when you want satisfying comfort food within moderate calories.'),

('Rajasthani Dal Baati', 'lunch', '13:30',
 '[{"name":"Whole wheat baati (2)","caloriesKcal":320,"proteinG":8,"carbsG":56,"fatsG":8},{"name":"Panchmel dal (5-lentil)","caloriesKcal":200,"proteinG":14,"carbsG":32,"fatsG":2},{"name":"Ghee (for baati)","caloriesKcal":90,"proteinG":0,"carbsG":0,"fatsG":10}]',
 'Bake whole wheat baati balls. Prepare panchmel dal with 5 lentils. Dip baati in dal and ghee.',
 610, 22, 88, 20,
 75,
 'WEIGHT GAIN / HEALTH MAINTENANCE. Traditional Rajasthani meal. Panchmel dal uses 5 varieties of lentils — exceptional protein and fibre diversity. High calorie. Excellent for labourers and highly active individuals. Rich in iron and zinc.'),

('Avial with Rice (Kerala)', 'lunch', '13:00',
 '[{"name":"Mixed vegetables (raw banana, drumstick, yam, beans, carrot)","caloriesKcal":120,"proteinG":4,"carbsG":26,"fatsG":0.5},{"name":"Coconut-cumin-yoghurt sauce","caloriesKcal":90,"proteinG":2.5,"carbsG":5,"fatsG":7},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Coconut oil (tempering)","caloriesKcal":45,"proteinG":0,"carbsG":0,"fatsG":5}]',
 'Cook mixed vegetables in spiced coconut-yoghurt sauce. Temper with coconut oil and curry leaves.',
 455, 10.5, 75, 13,
 55,
 'HEALTH MAINTENANCE. Kerala dish with extraordinary vegetable diversity in one preparation. Wide spectrum of vitamins and minerals. Coconut oil provides anti-microbial lauric acid. One of the most nutritionally diverse traditional Indian meals.'),

-- =============================================================================
-- ADDITIONAL SNACKS — Various Goals
-- =============================================================================

('Steamed Corn (Bhutta) with Spices', 'snack', '16:00',
 '[{"name":"Corn cob (steamed)","caloriesKcal":130,"proteinG":4.5,"carbsG":29,"fatsG":1.5},{"name":"Butter (small pat)","caloriesKcal":20,"proteinG":0,"carbsG":0,"fatsG":2.2},{"name":"Lemon, chaat masala, chilli","caloriesKcal":5,"proteinG":0,"carbsG":1,"fatsG":0}]',
 'Steam corn. Rub with lemon half, spread minimal butter and season with chaat masala.',
 155, 4.5, 30, 3.7,
 20,
 'HEALTH MAINTENANCE. Traditional Indian street snack made healthy. Corn is rich in lutein and zeaxanthin for eye health. High fibre. Antioxidant-rich. Popular across all regions. Low calorie when minimally buttered.'),

('Kachumber Salad', 'snack', '16:00',
 '[{"name":"Cucumber, tomato, onion (equal parts)","caloriesKcal":45,"proteinG":2,"carbsG":9,"fatsG":0.3},{"name":"Coriander, green chilli","caloriesKcal":5,"proteinG":0.3,"carbsG":1,"fatsG":0},{"name":"Lemon juice, chaat masala","caloriesKcal":8,"proteinG":0,"carbsG":2,"fatsG":0}]',
 'Finely dice all vegetables. Toss with coriander, chilli and lemon-based dressing.',
 58, 2.3, 12, 0.3,
 15,
 'FAT LOSS / HEALTH MAINTENANCE. Traditional Indian accompaniment eaten as a standalone snack. Very low calorie, high fibre and hydrating. Essential companion to rich meals for digestive balance. Eat as much as desired — virtually zero calories.'),

('Popcorn with Indian Spices', 'snack', '16:30',
 '[{"name":"Popcorn (air-popped)","caloriesKcal":100,"proteinG":3,"carbsG":20,"fatsG":1.2},{"name":"Chaat masala, turmeric, curry powder","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0},{"name":"Oil spray (minimal)","caloriesKcal":10,"proteinG":0,"carbsG":0,"fatsG":1}]',
 'Air-pop popcorn. Spray lightly with oil. Toss immediately with Indian spice mix.',
 115, 3.2, 21, 2.2,
 15,
 'WEIGHT LOSS / FAT LOSS. Surprisingly high-volume, low-calorie snack. Air-popped popcorn is a whole grain and high-fibre. Indian spicing makes it far more satisfying than plain. Excellent for television/movie snacking during diet phase.'),

('Dhokla (Steamed Gram Flour Cake)', 'snack', '16:00',
 '[{"name":"Besan (chickpea flour)","caloriesKcal":150,"proteinG":9,"carbsG":22,"fatsG":2.5},{"name":"Curd","caloriesKcal":40,"proteinG":2,"carbsG":3,"fatsG":2},{"name":"Eno (fruit salt)","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0},{"name":"Tempering: mustard, curry leaves, green chilli, oil","caloriesKcal":30,"proteinG":0.2,"carbsG":0.5,"fatsG":3}]',
 'Mix besan, curd and spices. Add Eno and steam immediately. Temper with mustard seeds and curry leaves.',
 220, 11.2, 25.5, 7.5,
 25,
 'HEALTH MAINTENANCE / WEIGHT LOSS. Classic Gujarati snack. Steamed not fried — much lower calorie than deep-fried snacks. High protein from besan. Probiotics from fermented curd. Light and filling. Good for daily snacking.'),

('Rajgira (Amaranth) Chikki', 'snack', '17:00',
 '[{"name":"Popped amaranth (rajgira)","caloriesKcal":90,"proteinG":3.5,"carbsG":18,"fatsG":1.5},{"name":"Jaggery","caloriesKcal":90,"proteinG":0.2,"carbsG":23,"fatsG":0}]',
 'Pop amaranth seeds in dry pan. Combine with melted jaggery and press into bars.',
 180, 3.7, 41, 1.5,
 20,
 'HEALTH MAINTENANCE / WEIGHT GAIN. Rajgira (amaranth) is a complete protein grain — unusual in plant foods. Very rich in calcium, iron and magnesium. Traditional Navratri snack. High calorie from jaggery. Excellent for hair health and bone density.'),

-- =============================================================================
-- ADDITIONAL DINNER — Various
-- =============================================================================

('Masoor Dal with Spinach and Roti', 'dinner', '20:00',
 '[{"name":"Red masoor dal","caloriesKcal":130,"proteinG":10,"carbsG":22,"fatsG":0.5},{"name":"Spinach (palak)","caloriesKcal":25,"proteinG":2.5,"carbsG":3.5,"fatsG":0.4},{"name":"Garlic, cumin, tomato","caloriesKcal":30,"proteinG":1,"carbsG":6,"fatsG":0},{"name":"Roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3},{"name":"Ghee tadka","caloriesKcal":30,"proteinG":0,"carbsG":0,"fatsG":3.3}]',
 'Cook masoor dal with spinach until blended. Temper with garlic and cumin in ghee.',
 415, 20.5, 71.5, 7.2,
 35,
 'HEALTH MAINTENANCE / WEIGHT LOSS. Masoor dal cooks fastest of all dals — excellent for quick weeknight dinners. Red lentils are high in folate and iron. Spinach doubles the iron and folate content. Excellent anti-anaemia dinner.'),

('Gawar Phali (Cluster Beans) Sabzi with Dal', 'dinner', '20:00',
 '[{"name":"Cluster beans (gawar)","caloriesKcal":45,"proteinG":3,"carbsG":8,"fatsG":0.4},{"name":"Moong dal","caloriesKcal":130,"proteinG":9,"carbsG":22,"fatsG":0.5},{"name":"Onion, garlic, tomato, spices","caloriesKcal":40,"proteinG":1.5,"carbsG":8,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3}]',
 'Stir-fry cluster beans with spices and onion. Serve alongside moong dal and rotis.',
 455, 20.5, 78, 8.4,
 35,
 'HEALTH MAINTENANCE / DIABETES MANAGEMENT. Cluster beans (guar) are extraordinarily rich in soluble fibre, especially galactomannan — proven to reduce blood sugar and cholesterol. Very traditional, underused vegetable. Excellent for diabetics and anyone focused on gut health.'),

('Baingan Bharta with Roti', 'dinner', '20:00',
 '[{"name":"Roasted eggplant (baingan)","caloriesKcal":60,"proteinG":2.5,"carbsG":11,"fatsG":0.8},{"name":"Onion, tomato, garlic, green chilli","caloriesKcal":50,"proteinG":2,"carbsG":10,"fatsG":0},{"name":"Oil","caloriesKcal":40,"proteinG":0,"carbsG":0,"fatsG":4.5},{"name":"Roti (2)","caloriesKcal":200,"proteinG":7,"carbsG":40,"fatsG":3}]',
 'Roast whole eggplant directly on flame. Peel, mash. Sauté with onion, tomato and spices.',
 350, 11.5, 61, 8.3,
 30,
 'HEALTH MAINTENANCE / WEIGHT LOSS. Smoke-roasted eggplant is rich in nasunin — a powerful brain-protecting antioxidant. Very low calorie. High fibre. The smoky flavour creates satisfaction without high calories. Classic North Indian home dinner.'),

('Kadhi Pakora with Rice', 'dinner', '20:00',
 '[{"name":"Curd (for kadhi)","caloriesKcal":80,"proteinG":4,"carbsG":6,"fatsG":4},{"name":"Besan (for kadhi and pakora)","caloriesKcal":150,"proteinG":9,"carbsG":22,"fatsG":2.5},{"name":"Steamed rice","caloriesKcal":200,"proteinG":4,"carbsG":44,"fatsG":0.5},{"name":"Oil (for tadka and frying)","caloriesKcal":80,"proteinG":0,"carbsG":0,"fatsG":9},{"name":"Curry leaves, mustard, fenugreek seeds","caloriesKcal":10,"proteinG":0.3,"carbsG":2,"fatsG":0.2}]',
 'Make kadhi from curd and besan. Fry besan pakoras and add to kadhi. Temper with spices. Serve over rice.',
 520, 17.3, 74, 16.2,
 50,
 'HEALTH MAINTENANCE. Traditional comfort dinner from Punjab and Rajasthan. Curd-based kadhi is probiotic-rich and aids digestion. Fenugreek seeds in tempering reduce blood sugar. Moderate calorie — suitable for most goals. Weekend comfort meal.'),

('Jowar Bhakri with Shengdana Chutney', 'dinner', '19:30',
 '[{"name":"Jowar flour bhakri (2)","caloriesKcal":160,"proteinG":5,"carbsG":34,"fatsG":1},{"name":"Peanut (shengdana) chutney","caloriesKcal":120,"proteinG":5,"carbsG":5,"fatsG":10},{"name":"Onion and green chilli (raw)","caloriesKcal":15,"proteinG":0.5,"carbsG":3,"fatsG":0}]',
 'Make thick jowar bhakri on tawa. Serve with spiced peanut chutney and raw onion.',
 295, 10.5, 42, 11,
 25,
 'HEALTH MAINTENANCE / WEIGHT LOSS. Traditional Maharashtrian dinner. Jowar (sorghum) is gluten-free, high in iron and resistant starch. Very high fibre. The peanut chutney provides protein and healthy fats. Simple, nutritious and affordable rural staple.'),

-- =============================================================================
-- ADDITIONAL JUICES
-- =============================================================================

('Giloy (Heart-leaf Moonseed) Juice', 'snack', '07:00',
 '[{"name":"Giloy stem juice or powder","caloriesKcal":10,"proteinG":0.5,"carbsG":2,"fatsG":0},{"name":"Amla juice","caloriesKcal":20,"proteinG":0.3,"carbsG":5,"fatsG":0.1},{"name":"Water and honey (optional)","caloriesKcal":15,"proteinG":0,"carbsG":4,"fatsG":0}]',
 'Mix giloy juice with amla juice and water. Drink on empty stomach.',
 45, 0.8, 11, 0.1,
 20,
 'HEALTH MAINTENANCE / IMMUNITY. Giloy is considered a divine herb in Ayurveda — proven adaptogen and immunomodulator. Reduces chronic inflammation and improves platelet count. Excellent during seasonal illness and for overall immunity maintenance. Drink 3-4 times per week.'),

('Lauki (Bottle Gourd) Mint Juice', 'snack', '07:00',
 '[{"name":"Bottle gourd (lauki, raw)","caloriesKcal":18,"proteinG":0.7,"carbsG":4,"fatsG":0.1},{"name":"Mint leaves","caloriesKcal":3,"proteinG":0.2,"carbsG":0.5,"fatsG":0},{"name":"Ginger, lemon, black salt","caloriesKcal":10,"proteinG":0.2,"carbsG":2.5,"fatsG":0}]',
 'Juice raw lauki with mint and ginger. Add black salt and lemon.',
 31, 1.1, 7, 0.1,
 15,
 'WEIGHT LOSS / KIDNEY HEALTH. Lauki juice is one of the lowest calorie beverages possible. Extremely hydrating and alkalising. Supports kidney function and reduces cholesterol. Drink on empty stomach for best results. Note: Do NOT juice lauki if it tastes bitter — this indicates toxic cucurbitacin content.'),

('Methi (Fenugreek) Seed Water', 'snack', '06:30',
 '[{"name":"Fenugreek seeds (1 tsp, soaked overnight)","caloriesKcal":12,"proteinG":0.8,"carbsG":2.5,"fatsG":0.3},{"name":"Warm water","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0}]',
 'Soak methi seeds overnight in water. Drink the water and chew the seeds in the morning.',
 12, 0.8, 2.5, 0.3,
 5,
 'HAIR CARE / DIABETES MANAGEMENT / HEALTH MAINTENANCE. Methi seed water is traditionally consumed for blood sugar management, hair fall control and hormonal balance. Galactomannan in methi slows glucose absorption. Saponins in methi seeds directly promote hair growth and scalp health. Daily morning habit.'),

('Aloe Vera Amla Juice', 'snack', '07:00',
 '[{"name":"Aloe vera gel (fresh, 2 tbsp)","caloriesKcal":10,"proteinG":0.2,"carbsG":2,"fatsG":0},{"name":"Amla juice (30ml)","caloriesKcal":20,"proteinG":0.3,"carbsG":5,"fatsG":0.1},{"name":"Water, rock salt, lemon","caloriesKcal":8,"proteinG":0,"carbsG":2,"fatsG":0}]',
 'Extract fresh aloe vera gel. Blend with amla juice, water and seasoning.',
 38, 0.5, 9, 0.1,
 20,
 'HAIR CARE / SKIN HEALTH / IMMUNITY. Aloe vera provides proteolytic enzymes that repair scalp cells; amla provides Vitamin C for collagen production. Together they form a powerful internal hair and skin tonic. Reduce acne and improve skin texture from within. Drink 4-5x per week.'),

('Tulsi Ginger Honey Kadha', 'snack', '07:00',
 '[{"name":"Fresh tulsi (holy basil) leaves","caloriesKcal":5,"proteinG":0.3,"carbsG":0.8,"fatsG":0.1},{"name":"Ginger (1 inch)","caloriesKcal":8,"proteinG":0.2,"carbsG":2,"fatsG":0.1},{"name":"Black pepper (5 corns)","caloriesKcal":5,"proteinG":0.2,"carbsG":1,"fatsG":0.1},{"name":"Honey (1 tsp)","caloriesKcal":22,"proteinG":0,"carbsG":6,"fatsG":0},{"name":"Water","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0}]',
 'Boil tulsi, ginger and black pepper in water for 10 minutes. Strain, cool slightly, add honey.',
 40, 0.7, 9.8, 0.3,
 10,
 'HEALTH MAINTENANCE / IMMUNITY. Traditional Indian kadha consumed for centuries. Tulsi is the most revered medicinal herb in India — adaptogen, anti-viral, stress-reducer. Ginger is anti-inflammatory. Honey is antimicrobial. Excellent during change of seasons and as a daily immunity ritual.'),

('Watermelon Mint Lime Juice', 'snack', '15:00',
 '[{"name":"Watermelon","caloriesKcal":60,"proteinG":1.2,"carbsG":15,"fatsG":0.2},{"name":"Mint leaves","caloriesKcal":3,"proteinG":0.2,"carbsG":0.5,"fatsG":0},{"name":"Lime juice","caloriesKcal":8,"proteinG":0.1,"carbsG":2,"fatsG":0},{"name":"Black salt","caloriesKcal":0,"proteinG":0,"carbsG":0,"fatsG":0}]',
 'Blend watermelon. Strain and mix with lime juice, mint and black salt.',
 71, 1.5, 17.5, 0.2,
 20,
 'FAT LOSS / HYDRATION / SUMMER. Watermelon is 92% water and very low calorie. Rich in lycopene (anti-cancer antioxidant) and L-citrulline (improves blood flow and reduces muscle soreness post-workout). Black salt aids electrolyte balance. Perfect Hyderabad summer drink.'),

('Banana Dates Jaggery Shake', 'snack', '16:00',
 '[{"name":"Banana (1)","caloriesKcal":90,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"name":"Dates (3, pitted)","caloriesKcal":67,"proteinG":0.5,"carbsG":18,"fatsG":0.1},{"name":"Jaggery (small piece)","caloriesKcal":30,"proteinG":0.1,"carbsG":7.5,"fatsG":0},{"name":"Full fat milk","caloriesKcal":100,"proteinG":5,"carbsG":8,"fatsG":5}]',
 'Blend all ingredients together. Serve chilled or at room temperature.',
 287, 6.7, 56.5, 5.4,
 35,
 'WEIGHT GAIN / PRE-WORKOUT / ENERGY. Traditional high-energy Indian shake. Dates provide iron and fast carbs; jaggery provides iron and trace minerals; banana provides potassium. Natural alternative to commercial pre-workout drinks. Very popular among traditional athletes and wrestlers.')

ON CONFLICT (lower(name)) DO NOTHING;

-- =============================================================================
-- Backfill: link existing user meal_templates to master catalog by name match
-- =============================================================================
UPDATE meal_templates mt
SET master_meal_template_id = mmt.id
FROM master_meal_templates mmt
WHERE lower(mt.name) = lower(mmt.name)
  AND mt.master_meal_template_id IS NULL;