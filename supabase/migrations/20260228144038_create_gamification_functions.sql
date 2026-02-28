/*
  # Create Gamification Functions

  1. Functions
    - `add_points` - Function to add points to user and level up
    
  2. Notes
    - Automatically calculates level based on points
    - Level 1 = 0-99 points
    - Level 2 = 100-299 points
    - Level 3 = 300-699 points
    - Level 4 = 700-1499 points
    - Level 5 = 1500+ points
*/

CREATE OR REPLACE FUNCTION add_points(user_id uuid, points_to_add integer)
RETURNS void AS $$
DECLARE
  new_points integer;
  new_level integer;
BEGIN
  UPDATE user_profiles
  SET points = points + points_to_add,
      updated_at = now()
  WHERE id = user_id
  RETURNING points INTO new_points;

  IF new_points >= 1500 THEN
    new_level := 5;
  ELSIF new_points >= 700 THEN
    new_level := 4;
  ELSIF new_points >= 300 THEN
    new_level := 3;
  ELSIF new_points >= 100 THEN
    new_level := 2;
  ELSE
    new_level := 1;
  END IF;

  UPDATE user_profiles
  SET level = new_level
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;