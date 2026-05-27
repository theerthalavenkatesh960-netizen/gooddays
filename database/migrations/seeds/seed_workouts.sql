
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
