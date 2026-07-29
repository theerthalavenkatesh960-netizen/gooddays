-- Migration 015: Add exercise animation fields for advanced form guidance
-- Adds support for animated exercise demonstrations with muscle engagement tracking

ALTER TABLE exercises
ADD COLUMN video_url VARCHAR(255),
ADD COLUMN beginner_tips TEXT,
ADD COLUMN animation_frames JSONB DEFAULT '[]',
ADD COLUMN common_mistakes JSONB DEFAULT '[]';

-- Create index for animation lookup
CREATE INDEX idx_exercises_has_animation ON exercises USING gin (animation_frames);

-- Add comment documenting JSON structures
COMMENT ON COLUMN exercises.animation_frames IS 
  'JSON array of animation keyframes. Example: [{"phase": 0, "name": "Starting Position", "duration": 0.5, "muscles": {"biceps-long": 0.0}, "cue": "Stand straight"}]';

COMMENT ON COLUMN exercises.common_mistakes IS 
  'JSON array of common mistakes. Example: [{"mistake": "Swinging weight", "correction": "Keep elbows tucked", "highlightedMuscles": ["biceps-long"]}]';

COMMENT ON COLUMN exercises.beginner_tips IS 
  'Comma-separated form cues for beginners';

COMMENT ON COLUMN exercises.video_url IS 
  'URL to GIF or MP4 video showing proper exercise form';
