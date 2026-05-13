-- ============================================================
-- MEAL INGREDIENTS + TEMPLATES SEED
-- Profile: Male, 6ft (183cm), 68kg → 80kg lean bulk
-- Goal: ~2800-3000 kcal/day | 160-180g protein | Budget-friendly India
-- All macros per 100g unless noted
-- ============================================================

-- ============================================================
-- SECTION 1: MEAL INGREDIENTS
-- ============================================================

-- Proteins (Budget-friendly)
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chicken Breast',165,31,0,3.6,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chicken Breast'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chicken Thigh Boneless',177,25,0,8,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chicken Thigh Boneless'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Egg Whole',155,13,1.1,11,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Egg Whole'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Egg Whites',52,11,0.7,0.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Egg Whites'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Paneer',265,18,6,20,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Paneer'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Paneer Bhurji',265,18,8,18,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Paneer Bhurji'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Tuna',132,28,0,1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Tuna'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Tandoori Chicken',220,32,3,8,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Tandoori Chicken'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chicken Keema',215,26,2,11,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chicken Keema'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Whey Protein',400,80,8,6,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Whey Protein'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Greek Yogurt',97,10,3.6,5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Greek Yogurt'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Curd Homemade',60,3.5,4.7,3.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Curd Homemade'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Milk Full Fat',61,3.2,5,3.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Milk Full Fat'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Milk Toned',46,3.5,4.7,1.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Milk Toned'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Soya Chunks',345,52,33,0.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Soya Chunks'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Moong Dal',347,24,63,1.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Moong Dal'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Masoor Dal',353,26,60,1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Masoor Dal'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chana Dal',364,22,60,5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chana Dal'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Dal Tadka Cooked',140,8,18,4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Dal Tadka Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Rajma Cooked',127,8.7,22,0.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Rajma Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chole Cooked',180,9,27,4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chole Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Sprouts Mixed',97,9,17,0.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Sprouts Mixed'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Peanuts Roasted',567,26,16,49,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Peanuts Roasted'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Peanut Butter',588,25,20,50,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Peanut Butter'));

-- Carbs (Budget-friendly staples)
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Brown Rice',111,2.6,23,0.9,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Brown Rice'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'White Rice Cooked',130,2.7,28,0.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('White Rice Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Basmati Rice Cooked',121,3.5,25,0.4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Basmati Rice Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Oats Rolled',389,16.9,66.3,6.9,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Oats Rolled'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Whole Wheat Roti',120,4,22,2.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Whole Wheat Roti'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Multigrain Roti',115,4.5,21,2.8,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Multigrain Roti'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Whole Wheat Bread',247,13,41,4.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Whole Wheat Bread'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Idli',58,2,12,0.4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Idli'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Dosa Plain',168,4,28,3.7,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Dosa Plain'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Upma',209,5,30,7,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Upma'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Poha',180,4,32,4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Poha'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Quinoa Cooked',120,4.4,21.3,1.9,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Quinoa Cooked'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Sweet Potato',86,1.6,20,0.1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Sweet Potato'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Banana',89,1.1,23,0.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Banana'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Khichdi',160,6,28,3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Khichdi'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Curd Rice',190,5,28,6,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Curd Rice'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chicken Biryani',240,15,28,8,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chicken Biryani'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Rava Semolina',360,13,72,1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Rava Semolina'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Bread Brown',265,9,49,3.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Bread Brown'));

-- Vegetables (Micronutrients + fiber)
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Spinach',23,2.9,3.6,0.4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Spinach'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Broccoli',34,2.8,7,0.4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Broccoli'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Capsicum',31,1,7,0.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Capsicum'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Onion',40,1.1,9.3,0.1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Onion'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Tomato',18,0.9,3.9,0.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Tomato'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Carrot',41,0.9,10,0.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Carrot'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Cucumber',15,0.7,3.6,0.1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Cucumber'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Mixed Vegetables',65,3,12,1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Mixed Vegetables'));

-- Fats + Condiments
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Ghee',900,0,0,100,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Ghee'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Coconut Oil',862,0,0,100,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Coconut Oil'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Olive Oil',884,0,0,100,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Olive Oil'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Almonds',579,21,22,50,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Almonds'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Walnuts',654,15,14,65,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Walnuts'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Flaxseeds',534,18,29,42,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Flaxseeds'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Chia Seeds',486,17,42,31,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Chia Seeds'));

-- Fruits
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Apple',52,0.3,14,0.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Apple'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Papaya',43,0.5,11,0.3,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Papaya'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Mango',60,0.8,15,0.4,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Mango'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Orange',47,0.9,12,0.1,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Orange'));

-- Misc / Drinks
INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Coconut Water',19,0.7,3.7,0.2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Coconut Water'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Green Tea',1,0.2,0.2,0,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Green Tea'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Buttermilk Chaas',20,1.6,2.6,0.6,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Buttermilk Chaas'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Sambar',55,3,8,1.5,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Sambar'));

INSERT INTO meal_ingredients (user_id,name,calories_kcal,protein_g,carbs_g,fats_g,created_at)
SELECT 1,'Sprouts Chaat',120,8,18,2,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_ingredients WHERE user_id=1 AND lower(name)=lower('Sprouts Chaat'));

-- ============================================================
-- SECTION 2: MEAL TEMPLATES
-- Target: ~2800-3000 kcal/day | 160-180g protein
-- Budget meals marked with (Budget) in recipe notes
-- ============================================================

-- ================================================================
-- BREAKFAST MEALS (target 500-700 kcal, 30-45g protein per meal)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Egg White Omelette + Oats Bowl','breakfast',
'[{"id":5,"name":"Egg Whites","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":104,"proteinG":22,"carbsG":1.4,"fatsG":0.4},{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11},{"id":6,"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311.2,"proteinG":13.52,"carbsG":53.04,"fatsG":5.52},{"id":12,"name":"Milk Toned","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":92,"proteinG":7,"carbsG":9.4,"fatsG":3}]',
'Budget workhorse breakfast. Cook 2 whole eggs + 4 egg whites as omelette with onion/spinach and minimal oil. Cook oats with 200ml toned milk, add banana slices. Total ~660 kcal | 55g protein. Eggs from local vendor = very cheap protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Egg White Omelette + Oats Bowl'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Masala Oats with Egg Bhurji','breakfast',
'[{"id":6,"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311.2,"proteinG":13.52,"carbsG":53.04,"fatsG":5.52},{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2},{"id":8,"name":"Onion","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":20,"proteinG":0.55,"carbsG":4.65,"fatsG":0.05}]',
'Savory oats with veggies cooked like upma. Egg bhurji on side (2 whole + 2 whites). Budget king meal. ~615 kcal | 44g protein. Easy 15 min prep.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Masala Oats with Egg Bhurji'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Idli Sambar High Protein','breakfast',
'[{"id":14,"name":"Idli","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":174,"proteinG":6,"carbsG":36,"fatsG":1.2},{"id":44,"name":"Sambar","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":137.5,"proteinG":7.5,"carbsG":20,"fatsG":3.75},{"id":5,"name":"Egg Whites","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":78,"proteinG":16.5,"carbsG":1.05,"fatsG":0.3}]',
'5 idlis with dal-heavy sambar. Boiled egg whites on side for protein top-up. Very budget-friendly South Indian classic. ~390 kcal | 30g protein. Add coconut chutney for extra cals on bulk days.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Idli Sambar High Protein'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Poha Peanut Protein Bowl','breakfast',
'[{"id":17,"name":"Poha","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":360,"proteinG":8,"carbsG":64,"fatsG":8},{"id":23,"name":"Peanuts Roasted","qty":40,"baseQty":100,"baseUnit":"g","caloriesKcal":226.8,"proteinG":10.4,"carbsG":6.4,"fatsG":19.6},{"id":5,"name":"Egg Whites","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":78,"proteinG":16.5,"carbsG":1.05,"fatsG":0.3}]',
'Poha with extra peanuts for protein + healthy fats. Pair with boiled egg whites. Budget breakfast under ₹40. ~665 kcal | 35g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Poha Peanut Protein Bowl'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Overnight Oats Muscle Builder','breakfast',
'[{"id":6,"name":"Oats Rolled","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":389,"proteinG":16.9,"carbsG":66.3,"fatsG":6.9},{"id":7,"name":"Greek Yogurt","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":145.5,"proteinG":15,"carbsG":5.4,"fatsG":7.5},{"id":13,"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"id":24,"name":"Peanut Butter","qty":20,"baseQty":100,"baseUnit":"g","caloriesKcal":117.6,"proteinG":5,"carbsG":4,"fatsG":10}]',
'Mix oats, greek yogurt and milk in container the night before. Add banana and PB in morning. No cooking needed. ~741 kcal | 38g protein. Great for busy mornings.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Overnight Oats Muscle Builder'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Egg Toast with Milk','breakfast',
'[{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2},{"id":10,"name":"Whole Wheat Bread","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":247,"proteinG":13,"carbsG":41,"fatsG":4.2},{"id":12,"name":"Milk Toned","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":138,"proteinG":10.5,"carbsG":14.1,"fatsG":4.5}]',
'Scrambled eggs (3 whole + 2 whites) on 2 slices WW toast. 300ml toned milk. Classic budget lean bulk breakfast. ~670 kcal | 54g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Egg Toast with Milk'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Upma Egg Combo','breakfast',
'[{"id":16,"name":"Upma","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":522.5,"proteinG":12.5,"carbsG":75,"fatsG":17.5},{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2}]',
'Vegetable upma with 1 whole egg + 2 egg whites omelette on side. Budget meal under ₹35. ~730 kcal | 36.5g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Upma Egg Combo'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Moong Dal Chilla','breakfast',
'[{"id":16,"name":"Moong Dal","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":347,"proteinG":24,"carbsG":63,"fatsG":1.2},{"id":8,"name":"Onion","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":20,"proteinG":0.55,"carbsG":4.65,"fatsG":0.05},{"id":9,"name":"Spinach","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":11.5,"proteinG":1.45,"carbsG":1.8,"fatsG":0.2},{"id":42,"name":"Curd Homemade","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":90,"proteinG":5.25,"carbsG":7.05,"fatsG":4.95}]',
'Soak moong dal overnight, grind to batter with spices. Make 3-4 chillas on tawa with minimal ghee. Serve with homemade curd. Very budget, very filling. ~469 kcal | 31g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Moong Dal Chilla'));

-- ================================================================
-- LUNCH MEALS (target 700-900 kcal, 40-55g protein)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Dal Rice Thali','lunch',
'[{"id":1,"name":"Chicken Breast","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":330,"proteinG":62,"carbsG":0,"fatsG":7.2},{"id":19,"name":"Dal Tadka Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":280,"proteinG":16,"carbsG":36,"fatsG":8},{"id":3,"name":"White Rice Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":325,"proteinG":6.75,"carbsG":70,"fatsG":0.75}]',
'The lean bulk power thali. 200g grilled/curry chicken + dal + rice. Roti optional. ~935 kcal | 85g protein. Chicken curry base costs under ₹80 per meal.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Dal Rice Thali'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Rajma Rice Muscle Meal','lunch',
'[{"id":20,"name":"Rajma Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":381,"proteinG":26.1,"carbsG":66,"fatsG":1.5},{"id":3,"name":"White Rice Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":325,"proteinG":6.75,"carbsG":70,"fatsG":0.75},{"id":42,"name":"Curd Homemade","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":60,"proteinG":3.5,"carbsG":4.7,"fatsG":3.3}]',
'Budget king meal. 300g rajma curry + 250g rice + small curd. Rajma from kirana store is very cheap, high protein. ~766 kcal | 36g protein. Best cooked in bulk for the week.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Rajma Rice Muscle Meal'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Paneer Roti High Protein Lunch','lunch',
'[{"id":5,"name":"Paneer","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":397.5,"proteinG":27,"carbsG":9,"fatsG":30},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":19,"name":"Dal Tadka Cooked","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":210,"proteinG":12,"carbsG":27,"fatsG":6}]',
'Paneer sabzi + 3 rotis + small dal. Complete amino acid profile. ~787 kcal | 45g protein. Paneer from local dairy is cheaper than packaged.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Paneer Roti High Protein Lunch'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Soya Keema Rice Bowl','lunch',
'[{"id":15,"name":"Soya Chunks","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":276,"proteinG":41.6,"carbsG":26.4,"fatsG":0.4},{"id":3,"name":"White Rice Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":325,"proteinG":6.75,"carbsG":70,"fatsG":0.75},{"id":8,"name":"Onion","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":32,"proteinG":0.88,"carbsG":7.44,"fatsG":0.08}]',
'Soya chunks keema with rice. Cheapest high-protein meal possible - 80g dry soya chunks = ~42g protein for under ₹15. Soak, mince and cook with spices. ~633 kcal | 49g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Soya Keema Rice Bowl'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chole Roti Bulk Lunch','lunch',
'[{"id":21,"name":"Chole Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":540,"proteinG":27,"carbsG":81,"fatsG":12},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":42,"name":"Curd Homemade","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":90,"proteinG":5.25,"carbsG":7.05,"fatsG":4.95}]',
'Full chole bhature-style but with rotis instead. 300g chole curry + 3 rotis + curd. ~810 kcal | 38g protein. Chole cooked in pressure cooker lasts 3 days.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chole Roti Bulk Lunch'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Roti Roll','lunch',
'[{"id":1,"name":"Chicken Breast","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":247.5,"proteinG":46.5,"carbsG":0,"fatsG":5.4},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":8,"name":"Onion","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":20,"proteinG":0.55,"carbsG":4.65,"fatsG":0.05}]',
'Shredded grilled chicken inside 2 large rotis with onion and green chutney. Portable lean bulk meal. ~448 kcal | 53g protein. Great for meal prep.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Roti Roll'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Egg Fried Rice Bowl','lunch',
'[{"id":3,"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9},{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2},{"id":28,"name":"Mixed Vegetables","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":65,"proteinG":3,"carbsG":12,"fatsG":1}]',
'High-carb egg fried rice with 3 whole eggs + 2 whites. Good on leg day / post training. ~740 kcal | 42g protein. Quick 10 min cook.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Egg Fried Rice Bowl'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Paneer Bhurji Roti Lunch','lunch',
'[{"id":6,"name":"Paneer Bhurji","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":530,"proteinG":36,"carbsG":16,"fatsG":36},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":42,"name":"Curd Homemade","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":60,"proteinG":3.5,"carbsG":4.7,"fatsG":3.3}]',
'Paneer bhurji with spices, capsicum, onion + 3 rotis + curd. High protein filling lunch. ~770 kcal | 45.5g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Paneer Bhurji Roti Lunch'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Keema Roti','lunch',
'[{"id":29,"name":"Chicken Keema","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":430,"proteinG":52,"carbsG":4,"fatsG":22},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":28,"name":"Mixed Vegetables","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":65,"proteinG":3,"carbsG":12,"fatsG":1}]',
'Minced chicken cooked with onion/tomato/spices. Served with 3 rotis. Keema is cheaper cut vs breast. ~675 kcal | 61g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Keema Roti'));

-- ================================================================
-- DINNER MEALS (target 600-800 kcal, 40-50g protein)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Dal Roti with Curd Dinner','dinner',
'[{"id":19,"name":"Dal Tadka Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":420,"proteinG":24,"carbsG":54,"fatsG":12},{"id":9,"name":"Whole Wheat Roti","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":240,"proteinG":8,"carbsG":44,"fatsG":5},{"id":42,"name":"Curd Homemade","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":90,"proteinG":5.25,"carbsG":7.05,"fatsG":4.95}]',
'Classic Indian dinner. Thick dal tadka + 4 rotis + curd. Budget at ₹50-60 per meal. ~750 kcal | 37g protein. Make big batches of dal on Sundays.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Dal Roti with Curd Dinner'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Biryani Bulk Dinner','dinner',
'[{"id":27,"name":"Chicken Biryani","qty":450,"baseQty":100,"baseUnit":"g","caloriesKcal":1080,"proteinG":67.5,"carbsG":126,"fatsG":36},{"id":42,"name":"Curd Homemade","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":90,"proteinG":5.25,"carbsG":7.05,"fatsG":4.95}]',
'Weekend bulk dinner. Full chicken biryani portion with raita. High calorie for catch-up on low intake days. ~1170 kcal | 73g protein. Cook at home to keep it clean.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Biryani Bulk Dinner'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Tandoori Chicken with Roti','dinner',
'[{"id":22,"name":"Tandoori Chicken","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":550,"proteinG":80,"carbsG":7.5,"fatsG":20},{"id":9,"name":"Whole Wheat Roti","qty":120,"baseQty":100,"baseUnit":"g","caloriesKcal":144,"proteinG":4.8,"carbsG":26.4,"fatsG":3}]',
'High protein low-carb dinner. Marinate chicken thighs/legs in curd + spices, grill or oven-bake. ~694 kcal | 85g protein. Best protein-per-rupee dinner on gym days.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Tandoori Chicken with Roti'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Soya Chunk Curry Rice Dinner','dinner',
'[{"id":15,"name":"Soya Chunks","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":345,"proteinG":52,"carbsG":33,"fatsG":0.5},{"id":3,"name":"White Rice Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":325,"proteinG":6.75,"carbsG":70,"fatsG":0.75},{"id":42,"name":"Curd Homemade","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":60,"proteinG":3.5,"carbsG":4.7,"fatsG":3.3}]',
'Soya chunks curry (boil + cook in tomato-onion gravy) with rice + curd. 100g dry soya = 52g protein for ₹10-12. Most budget-efficient dinner possible. ~730 kcal | 62g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Soya Chunk Curry Rice Dinner'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Khichdi Egg Dinner','dinner',
'[{"id":26,"name":"Khichdi","qty":350,"baseQty":100,"baseUnit":"g","caloriesKcal":560,"proteinG":21,"carbsG":98,"fatsG":10.5},{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2}]',
'Comfort dinner with high carb khichdi + boiled eggs. Good for rest days or when stomach is upset. ~767 kcal | 45g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Khichdi Egg Dinner'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Curd Rice with Egg Whites','dinner',
'[{"id":25,"name":"Curd Rice","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":570,"proteinG":15,"carbsG":84,"fatsG":18},{"id":5,"name":"Egg Whites","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":104,"proteinG":22,"carbsG":1.4,"fatsG":0.4}]',
'Light recovery dinner. Curd rice + boiled egg whites. Good on rest days or late dinners. ~674 kcal | 37g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Curd Rice with Egg Whites'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Stir Fry with Rice','dinner',
'[{"id":1,"name":"Chicken Breast","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":330,"proteinG":62,"carbsG":0,"fatsG":7.2},{"id":28,"name":"Mixed Vegetables","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":97.5,"proteinG":4.5,"carbsG":18,"fatsG":1.5},{"id":3,"name":"White Rice Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":260,"proteinG":5.4,"carbsG":56,"fatsG":0.6}]',
'Stir fry chicken breast with veggies, garlic, soy sauce. Serve with rice. Clean high-protein dinner. ~688 kcal | 72g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Stir Fry with Rice'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Masoor Dal Roti Dinner','dinner',
'[{"id":17,"name":"Masoor Dal","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":282.4,"proteinG":20.8,"carbsG":48,"fatsG":0.8},{"id":9,"name":"Whole Wheat Roti","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":240,"proteinG":8,"carbsG":44,"fatsG":5},{"id":11,"name":"Tomato","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":18,"proteinG":0.9,"carbsG":3.9,"fatsG":0.2},{"id":42,"name":"Curd Homemade","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":60,"proteinG":3.5,"carbsG":4.7,"fatsG":3.3}]',
'Red lentil dal with 4 rotis + curd. Masoor dal cooks in 20 mins without soaking. ~600 kcal | 33g protein. Very budget under ₹40.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Masoor Dal Roti Dinner'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Paneer Roti Dinner','dinner',
'[{"id":5,"name":"Paneer","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":397.5,"proteinG":27,"carbsG":9,"fatsG":30},{"id":9,"name":"Whole Wheat Roti","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":240,"proteinG":8,"carbsG":44,"fatsG":5},{"id":42,"name":"Curd Homemade","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":60,"proteinG":3.5,"carbsG":4.7,"fatsG":3.3}]',
'Paneer masala with 4 rotis + curd. Local dairy paneer is budget-friendly. ~698 kcal | 38.5g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Paneer Roti Dinner'));

-- ================================================================
-- PRE-WORKOUT MEALS (target 350-500 kcal, moderate carbs)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Banana Oats Pre-Workout','pre-workout',
'[{"id":13,"name":"Banana","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":178,"proteinG":2.2,"carbsG":46,"fatsG":0.6},{"id":6,"name":"Oats Rolled","qty":60,"baseQty":100,"baseUnit":"g","caloriesKcal":233.4,"proteinG":10.14,"carbsG":39.78,"fatsG":4.14}]',
'Easy high-carb pre-workout fuel. 2 bananas + small oats bowl. Eat 60-90 min before training. ~411 kcal | 12g protein. Banana = cheapest pre-workout carb source in India.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Banana Oats Pre-Workout'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Sweet Potato Rice Pre-Workout','pre-workout',
'[{"id":13,"name":"Sweet Potato","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":172,"proteinG":3.2,"carbsG":40,"fatsG":0.2},{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11}]',
'Baked sweet potato + 2 boiled eggs. Slow + fast carbs combo for sustained energy. ~327 kcal | 16g protein. Have 1-1.5 hrs pre-gym.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Sweet Potato Rice Pre-Workout'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Roti PB Pre-Workout','pre-workout',
'[{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75},{"id":24,"name":"Peanut Butter","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":176.4,"proteinG":7.5,"carbsG":6,"fatsG":15},{"id":13,"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}]',
'2-3 rotis spread with peanut butter + banana on side. Super budget pre-workout. ~446 kcal | 14.6g protein. One of the most cost-effective fuel combos.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Roti PB Pre-Workout'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Rice Egg Pre-Workout Meal','pre-workout',
'[{"id":3,"name":"White Rice Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":260,"proteinG":5.4,"carbsG":56,"fatsG":0.6},{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2}]',
'Simple rice + eggs pre-workout. Easy to digest, loads glycogen. ~467 kcal | 29g protein. Leftover rice from lunch works perfectly.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Rice Egg Pre-Workout Meal'));

-- ================================================================
-- POST-WORKOUT MEALS (target 500-700 kcal, 40-60g protein, higher carbs)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Whey Banana Post-Workout Shake','post-workout',
'[{"id":30,"name":"Whey Protein","qty":40,"baseQty":100,"baseUnit":"g","caloriesKcal":160,"proteinG":32,"carbsG":3.2,"fatsG":2.4},{"id":13,"name":"Banana","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":133.5,"proteinG":1.65,"carbsG":34.5,"fatsG":0.45},{"id":12,"name":"Milk Toned","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":138,"proteinG":10.5,"carbsG":14.1,"fatsG":4.5}]',
'Immediate post-workout shake. Blend whey + banana + toned milk. ~432 kcal | 44g protein. Drink within 30 min of training.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Whey Banana Post-Workout Shake'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chicken Rice Post-Workout Meal','post-workout',
'[{"id":1,"name":"Chicken Breast","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":330,"proteinG":62,"carbsG":0,"fatsG":7.2},{"id":3,"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9}]',
'Classic post-workout staple. High carb + high protein. 200g grilled chicken + 300g cooked rice. ~720 kcal | 70g protein. Meal prep in advance and reheat.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chicken Rice Post-Workout Meal'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Egg Rice High Carb Post-Workout','post-workout',
'[{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":78,"proteinG":16.5,"carbsG":1.05,"fatsG":0.3},{"id":3,"name":"White Rice Cooked","qty":300,"baseQty":100,"baseUnit":"g","caloriesKcal":390,"proteinG":8.1,"carbsG":84,"fatsG":0.9}]',
'Budget post-workout: boiled eggs (3 whole + 3 whites) + big bowl of rice. ~700 kcal | 44g protein. Cheapest effective post-workout meal.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Egg Rice High Carb Post-Workout'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Protein Oats Post-Workout','post-workout',
'[{"id":6,"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311.2,"proteinG":13.52,"carbsG":53.04,"fatsG":5.52},{"id":30,"name":"Whey Protein","qty":35,"baseQty":100,"baseUnit":"g","caloriesKcal":140,"proteinG":28,"carbsG":2.8,"fatsG":2.1},{"id":12,"name":"Milk Toned","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":115,"proteinG":8.75,"carbsG":11.75,"fatsG":3.75}]',
'Cooked oats with whey stirred in and toned milk. Warm and filling post-workout. ~566 kcal | 50g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Protein Oats Post-Workout'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Banana Milk Recovery Shake','post-workout',
'[{"id":13,"name":"Banana","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":178,"proteinG":2.2,"carbsG":46,"fatsG":0.6},{"id":12,"name":"Milk Full Fat","qty":400,"baseQty":100,"baseUnit":"g","caloriesKcal":244,"proteinG":12.8,"carbsG":20,"fatsG":13.2},{"id":24,"name":"Peanut Butter","qty":30,"baseQty":100,"baseUnit":"g","caloriesKcal":176.4,"proteinG":7.5,"carbsG":6,"fatsG":15}]',
'No-whey budget post-workout shake. 2 bananas + 400ml full fat milk + PB. ~599 kcal | 22.5g protein. Add peanuts or almonds for more protein without whey.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Banana Milk Recovery Shake'));

-- ================================================================
-- SNACKS (target 200-400 kcal, 15-25g protein)
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Sprouts Chaat Protein Snack','snack',
'[{"id":22,"name":"Sprouts Mixed","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":194,"proteinG":18,"carbsG":34,"fatsG":1},{"id":8,"name":"Onion","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":20,"proteinG":0.55,"carbsG":4.65,"fatsG":0.05}]',
'Sprouted moong/moth beans mixed with onion, tomato, lemon, chaat masala. Sprout at home = nearly free. ~214 kcal | 18.5g protein. Best budget high-protein snack.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Sprouts Chaat Protein Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Boiled Eggs Snack','snack',
'[{"id":4,"name":"Egg Whole","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":155,"proteinG":13,"carbsG":1.1,"fatsG":11},{"id":5,"name":"Egg Whites","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":52,"proteinG":11,"carbsG":0.7,"fatsG":0.2}]',
'2 whole boiled eggs + 2 egg whites. Sprinkle chaat masala or eat plain. ~207 kcal | 24g protein. Prepare 6 eggs in advance for the day.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Boiled Eggs Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Peanut Banana Snack','snack',
'[{"id":23,"name":"Peanuts Roasted","qty":40,"baseQty":100,"baseUnit":"g","caloriesKcal":226.8,"proteinG":10.4,"carbsG":6.4,"fatsG":19.6},{"id":13,"name":"Banana","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":133.5,"proteinG":1.65,"carbsG":34.5,"fatsG":0.45}]',
'Roasted peanuts + banana. Budget king snack under ₹15. ~360 kcal | 12g protein. Good afternoon snack between meals.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Peanut Banana Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Curd Almonds Snack','snack',
'[{"id":42,"name":"Curd Homemade","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":120,"proteinG":7,"carbsG":9.4,"fatsG":6.6},{"id":32,"name":"Almonds","qty":25,"baseQty":100,"baseUnit":"g","caloriesKcal":144.75,"proteinG":5.25,"carbsG":5.5,"fatsG":12.5}]',
'200g curd with 25 almonds. Quick protein + fat snack. ~265 kcal | 12.25g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Curd Almonds Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Paneer Cubes Snack','snack',
'[{"id":5,"name":"Paneer","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":265,"proteinG":18,"carbsG":6,"fatsG":20}]',
'100g raw paneer cubes with chaat masala + black pepper. No cooking. ~265 kcal | 18g protein. Eat between lunch and gym.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Paneer Cubes Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Milk Oats Shake','snack',
'[{"id":12,"name":"Milk Toned","qty":400,"baseQty":100,"baseUnit":"g","caloriesKcal":184,"proteinG":14,"carbsG":18.8,"fatsG":6},{"id":6,"name":"Oats Rolled","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":194.5,"proteinG":8.45,"carbsG":33.15,"fatsG":3.45},{"id":13,"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3}]',
'Blend oats, banana and toned milk. Budget gainer shake without whey. ~468 kcal | 23.5g protein. Great mid-morning or afternoon snack.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Milk Oats Shake'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Chaas Peanut Snack','snack',
'[{"id":45,"name":"Buttermilk Chaas","qty":400,"baseQty":100,"baseUnit":"g","caloriesKcal":80,"proteinG":6.4,"carbsG":10.4,"fatsG":2.4},{"id":23,"name":"Peanuts Roasted","qty":50,"baseQty":100,"baseUnit":"g","caloriesKcal":283.5,"proteinG":13,"carbsG":8,"fatsG":24.5}]',
'Glass of chaas (spiced buttermilk) with a handful of roasted peanuts. Gut-friendly, hydrating, protein-rich. ~364 kcal | 19.4g protein. Very Indian, very budget.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Chaas Peanut Snack'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Greek Yogurt Fruit Bowl','snack',
'[{"id":7,"name":"Greek Yogurt","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":194,"proteinG":20,"carbsG":7.2,"fatsG":10},{"id":13,"name":"Banana","qty":100,"baseQty":100,"baseUnit":"g","caloriesKcal":89,"proteinG":1.1,"carbsG":23,"fatsG":0.3},{"id":35,"name":"Flaxseeds","qty":10,"baseQty":100,"baseUnit":"g","caloriesKcal":53.4,"proteinG":1.8,"carbsG":2.9,"fatsG":4.2}]',
'Greek yogurt topped with banana and flaxseeds. Protein + omega-3s. ~336 kcal | 22.9g protein.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Greek Yogurt Fruit Bowl'));

-- ================================================================
-- SAMPLE FULL DAY PLANS (stored as dinner-type reference meals)
-- These are high-calorie combination reference meals
-- ================================================================

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Full Day Budget Meal Plan - Training Day','dinner',
'[{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":78,"proteinG":16.5,"carbsG":1.05,"fatsG":0.3},{"id":6,"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311.2,"proteinG":13.52,"carbsG":53.04,"fatsG":5.52},{"id":1,"name":"Chicken Breast","qty":400,"baseQty":100,"baseUnit":"g","caloriesKcal":660,"proteinG":124,"carbsG":0,"fatsG":14.4},{"id":3,"name":"White Rice Cooked","qty":500,"baseQty":100,"baseUnit":"g","caloriesKcal":650,"proteinG":13.5,"carbsG":140,"fatsG":1.5},{"id":19,"name":"Dal Tadka Cooked","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":280,"proteinG":16,"carbsG":36,"fatsG":8},{"id":13,"name":"Banana","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":178,"proteinG":2.2,"carbsG":46,"fatsG":0.6}]',
'REFERENCE PLAN - Training Day (~2950 kcal | 205g protein). Breakfast: Egg omelette + oats. Lunch: 200g chicken + rice + dal. Pre-workout: 2 bananas. Post-workout: Remaining chicken + rice. Dinner: Dal + roti + curd. Daily cost estimate ₹200-250 including eggs, chicken and staples.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Full Day Budget Meal Plan - Training Day'));

INSERT INTO meal_templates (user_id,name,timing,ingredients_json,recipe,image_url,created_at)
SELECT 1,'Full Day Budget Meal Plan - Rest Day','dinner',
'[{"id":4,"name":"Egg Whole","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":232.5,"proteinG":19.5,"carbsG":1.65,"fatsG":16.5},{"id":5,"name":"Egg Whites","qty":200,"baseQty":100,"baseUnit":"g","caloriesKcal":104,"proteinG":22,"carbsG":1.4,"fatsG":0.4},{"id":6,"name":"Oats Rolled","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":311.2,"proteinG":13.52,"carbsG":53.04,"fatsG":5.52},{"id":15,"name":"Soya Chunks","qty":80,"baseQty":100,"baseUnit":"g","caloriesKcal":276,"proteinG":41.6,"carbsG":26.4,"fatsG":0.4},{"id":20,"name":"Rajma Cooked","qty":250,"baseQty":100,"baseUnit":"g","caloriesKcal":317.5,"proteinG":21.75,"carbsG":55,"fatsG":1.25},{"id":3,"name":"White Rice Cooked","qty":350,"baseQty":100,"baseUnit":"g","caloriesKcal":455,"proteinG":9.45,"carbsG":98,"fatsG":1.05},{"id":9,"name":"Whole Wheat Roti","qty":150,"baseQty":100,"baseUnit":"g","caloriesKcal":180,"proteinG":6,"carbsG":33,"fatsG":3.75}]',
'REFERENCE PLAN - Rest Day (~1880 kcal | 134g protein). Slight calorie deficit on non-training days. Breakfast: Egg omelette + oats. Lunch: Soya curry + rice. Snack: Sprouts/peanuts. Dinner: Rajma + roti + curd. Full vegetarian day cost under ₹130.',
NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM meal_templates WHERE user_id=1 AND lower(name)=lower('Full Day Budget Meal Plan - Rest Day'));

-- ============================================================
-- SECTION 3: WORKOUT LIBRARY (LEAN BULK 68kg -> 78-82kg)
-- Exercises are seeded as global defaults (user_id = NULL).
-- Split presets are user-scoped in current schema (user_id is NOT NULL).
-- ============================================================

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Barbell Bench Press','Chest','Primary horizontal push compound for chest and triceps.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Bench Press'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Incline Dumbbell Press','Chest','Upper chest focused compound press.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Incline Dumbbell Press'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Cable Fly','Chest','Chest isolation movement with full range.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Cable Fly'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Barbell Bent Row','Back','Horizontal pull to build upper and mid back thickness.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Bent Row'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Pull Up','Back','Bodyweight vertical pull for lats and upper back.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Pull Up'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Lat Pulldown','Back','Machine vertical pull variation for lat hypertrophy.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Lat Pulldown'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Seated Cable Row','Back','Controlled row targeting lats and rhomboids.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Seated Cable Row'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Barbell Overhead Press','Shoulders','Primary vertical push compound for delts.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Overhead Press'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Dumbbell Shoulder Press','Shoulders','Dumbbell shoulder press for balanced development.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Dumbbell Shoulder Press'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Lateral Raise','Shoulders','Isolation lift for side delts and shoulder width.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Lateral Raise'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Face Pull','Shoulders','Rear delt and upper back health movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Face Pull'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Barbell Squat','Legs','Primary lower-body compound for quads and glutes.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Squat'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Romanian Deadlift','Legs','Hip hinge for hamstrings and posterior chain.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Romanian Deadlift'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Leg Press','Legs','High-volume compound for quads and glutes.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Press'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Bulgarian Split Squat','Legs','Single-leg movement for stability and hypertrophy.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Bulgarian Split Squat'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Leg Curl','Legs','Hamstring isolation movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Curl'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Leg Extension','Legs','Quadriceps isolation movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Extension'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Barbell Curl','Arms','Biceps mass builder with progressive overload.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Curl'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Hammer Curl','Arms','Biceps and brachialis focused curl variation.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Hammer Curl'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Rope Tricep Pushdown','Arms','Cable triceps isolation movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Rope Tricep Pushdown'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Skull Crusher','Arms','Triceps long-head focused extension movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Skull Crusher'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Plank','Core','Isometric core stability hold.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Plank'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Cable Crunch','Core','Weighted core flexion movement.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Cable Crunch'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Rowing Machine','Cardio','Low-impact conditioning for recovery days.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Rowing Machine'));

INSERT INTO exercises (name,muscle_group,description,image_url,is_custom,user_id,created_at)
SELECT 'Deadlift','Full Body','Full-body strength movement to build total mass.',NULL,false,NULL,now()
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Deadlift'));

INSERT INTO workout_split_presets (user_id,name,day_configs,is_active,created_at)
SELECT
  1,
  'Lean Bulk 5-Day - Intermediate',
  (
    json_build_object(
      'monday', json_build_array(
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Bench Press') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Incline Dumbbell Press') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 10),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Overhead Press') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Lateral Raise') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 15),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Rope Tricep Pushdown') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12)
      ),
      'tuesday', json_build_array(
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Bent Row') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Pull Up') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Lat Pulldown') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 10),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Seated Cable Row') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Curl') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12)
      ),
      'wednesday', json_build_array(
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Squat') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 6),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Romanian Deadlift') ORDER BY id LIMIT 1), 'sets', 4, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Press') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Curl') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Plank') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 1)
      ),
      'thursday', json_build_array(
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Deadlift') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 5),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Dumbbell Shoulder Press') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 10),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Face Pull') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 15),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Hammer Curl') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Skull Crusher') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 12)
      ),
      'friday', json_build_array(
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Barbell Squat') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 8),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Bulgarian Split Squat') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 10),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Leg Extension') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 15),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Cable Crunch') ORDER BY id LIMIT 1), 'sets', 3, 'reps', 15),
        json_build_object('exerciseId', (SELECT id FROM exercises WHERE user_id IS NULL AND lower(name)=lower('Rowing Machine') ORDER BY id LIMIT 1), 'sets', 1, 'reps', 12)
      ),
      'saturday', json_build_array(),
      'sunday', json_build_array()
    )::text
  ),
  true,
  now()
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE id = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM workout_split_presets
    WHERE user_id = 1
      AND lower(name) = lower('Lean Bulk 5-Day - Intermediate')
  );