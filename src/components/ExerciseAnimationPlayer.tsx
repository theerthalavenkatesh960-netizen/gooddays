import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import MuscleVisualization from './MuscleVisualization';

interface AnimationFrame {
  phase: number;
  name: string;
  duration: number; // seconds
  muscles: Record<string, number>; // muscle -> intensity (0-1)
  cue: string;
}

interface CommonMistake {
  mistake: string;
  correction: string;
  highlightedMuscles?: string[];
}

interface ExerciseAnimationPlayerProps {
  exerciseName: string;
  muscleGroup: string;
  videoUrl?: string;
  beginnerTips?: string;
  animationFrames?: string; // JSON string from DB
  commonMistakes?: string; // JSON string from DB
}

export default function ExerciseAnimationPlayer({
  exerciseName,
  muscleGroup,
  videoUrl,
  beginnerTips,
  animationFrames: animationFramesJson,
  commonMistakes: commonMistakesJson,
}: ExerciseAnimationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showMistakes, setShowMistakes] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [repCount, setRepCount] = useState(1);

  // Parse animation frames
  let frames: AnimationFrame[] = [];
  try {
    if (animationFramesJson) {
      frames = JSON.parse(animationFramesJson);
    }
  } catch {
    frames = DEFAULT_ANIMATIONS[exerciseName] || [];
  }

  // Parse common mistakes
  let mistakes: CommonMistake[] = [];
  try {
    if (commonMistakesJson) {
      mistakes = JSON.parse(commonMistakesJson);
    }
  } catch {
    mistakes = [];
  }

  // Parse beginner tips
  const tips = beginnerTips?.split(',').map(t => t.trim()).filter(Boolean) || [];

  // Animation loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const timer = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        return next >= frames.length ? 0 : next;
      });
    }, (frames[currentFrame]?.duration || 1) * 1000 / speed);

    return () => clearInterval(timer);
  }, [isPlaying, currentFrame, frames, speed]);

  if (frames.length === 0 && !videoUrl) {
    return (
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No animation data available for this exercise yet. Start with the form tips below.
        </p>
      </div>
    );
  }

  const currentAnimFrame = frames[currentFrame];
  const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);
  const elapsedTime = frames.slice(0, currentFrame).reduce((sum, f) => sum + f.duration, 0) + (currentAnimFrame?.duration || 0) * 0.5;

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Exercise Form Guide</h3>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(108, 99, 255, 0.1)', color: 'var(--accent)' }}>
            Rep {repCount}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{exerciseName}</p>
      </div>

      {/* Main Content - Two Columns */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Left: Animated Muscle Diagram */}
        {frames.length > 0 && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Movement Phase Visualization</p>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <MuscleVisualization highlightMuscle={currentAnimFrame?.muscles ? getHighlightedMuscle(currentAnimFrame.muscles, muscleGroup) : muscleGroup} height={250} />
            </div>
          </div>
        )}

        {/* Right: Video or Form Info */}
        {videoUrl && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Proper Form Reference</p>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', height: '250px' }}>
              <img src={videoUrl} alt={exerciseName} className="w-full h-full object-cover" onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23333" width="300" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EVideo unavailable%3C/text%3E%3C/svg%3E';
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Phase Info */}
      {currentAnimFrame && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(108, 99, 255, 0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              📍 {currentAnimFrame.name}
            </h4>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {Math.round(elapsedTime)}s / {Math.round(totalDuration)}s
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>💡 {currentAnimFrame.cue}</p>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
        {/* Play Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => {
              setCurrentFrame(0);
              setIsPlaying(false);
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={16} />
          </button>

          {/* Progress Bar */}
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', cursor: 'pointer' }}>
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: 'var(--accent)',
                width: `${(currentFrame / Math.max(frames.length - 1, 1)) * 100}%`,
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', minWidth: '24px' }}>
            {currentFrame + 1}/{frames.length}
          </span>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-elevated)', color: soundEnabled ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', minWidth: '50px' }}>Speed:</span>
          <div className="flex gap-1">
            {[0.5, 1, 1.5].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-1 rounded text-xs font-semibold transition"
                style={{
                  backgroundColor: speed === s ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: speed === s ? 'white' : 'var(--text-secondary)',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Rep Counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', minWidth: '50px' }}>Reps:</span>
          <button
            onClick={() => setRepCount(Math.max(1, repCount - 1))}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {repCount}
          </span>
          <button
            onClick={() => setRepCount(repCount + 1)}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Beginner Tips */}
      {tips.length > 0 && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>✓ Form Checklist</p>
          <div className="space-y-1">
            {tips.map((tip, idx) => (
              <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Common Mistakes Toggle */}
      {mistakes.length > 0 && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowMistakes(!showMistakes)}
            className="w-full px-4 py-3 text-left flex items-center justify-between"
            style={{ backgroundColor: 'rgba(255, 107, 53, 0.05)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>⚠️ Common Mistakes ({mistakes.length})</span>
            <span style={{ color: 'var(--text-muted)' }}>{showMistakes ? '−' : '+'}</span>
          </button>

          {showMistakes && (
            <div className="px-4 py-3 space-y-3" style={{ backgroundColor: 'rgba(255, 107, 53, 0.02)' }}>
              {mistakes.map((m, idx) => (
                <div key={idx} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', borderLeft: '3px solid #ff6b35' }}>
                  <p className="text-xs font-semibold" style={{ color: '#ff6b35' }}>❌ {m.mistake}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>✓ {m.correction}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: Get primary muscle to highlight based on intensity
function getHighlightedMuscle(muscles: Record<string, number>, fallback: string): string {
  const sorted = Object.entries(muscles).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || fallback;
}

// ─── DEFAULT ANIMATION LIBRARY ───────────────────────────────────────────────
// These are comprehensive animations for all common exercises
export const DEFAULT_ANIMATIONS: Record<string, AnimationFrame[]> = {
  'Barbell Curl': [
    {
      phase: 0,
      name: 'Starting Position',
      duration: 0.5,
      muscles: { 'Biceps – Long Head': 0, 'Biceps – Short Head': 0, 'Triceps – Long Head': 0.1 },
      cue: '💪 Stand straight, arms at sides, shoulders back, feet shoulder-width apart',
    },
    {
      phase: 1,
      name: 'Concentric (Lifting)',
      duration: 1.5,
      muscles: { 'Biceps – Long Head': 0.9, 'Biceps – Short Head': 0.7, 'Triceps – Long Head': 0.05 },
      cue: '⬆️ Curl the weight slowly, lead with your elbows, exhale as you lift',
    },
    {
      phase: 2,
      name: 'Peak Contraction',
      duration: 0.5,
      muscles: { 'Biceps – Long Head': 1.0, 'Biceps – Short Head': 1.0, 'Triceps – Long Head': 0 },
      cue: '💥 Squeeze hard at the top, feel the biceps burn for 1 second',
    },
    {
      phase: 3,
      name: 'Eccentric (Lowering)',
      duration: 2.0,
      muscles: { 'Biceps – Long Head': 0.6, 'Biceps – Short Head': 0.4, 'Triceps – Long Head': 0.1 },
      cue: '⬇️ Lower slowly (3-4 seconds), control the weight, don\'t drop it',
    },
  ],
  'Bench Press': [
    {
      phase: 0,
      name: 'Setup',
      duration: 0.5,
      muscles: { 'Upper Chest': 0.1, 'Mid Chest': 0.1, 'Front Delt': 0.05, 'Triceps – Long Head': 0.05 },
      cue: '📍 Lie flat, shoulder blades retracted, feet planted, grip shoulder-width',
    },
    {
      phase: 1,
      name: 'Descent',
      duration: 1.5,
      muscles: { 'Upper Chest': 0.5, 'Mid Chest': 0.6, 'Front Delt': 0.4, 'Triceps – Long Head': 0.3 },
      cue: '⬇️ Lower bar to mid-chest, elbows at ~45° angle, inhale',
    },
    {
      phase: 2,
      name: 'Bottom Position',
      duration: 0.3,
      muscles: { 'Upper Chest': 0.6, 'Mid Chest': 0.7, 'Front Delt': 0.5, 'Triceps – Long Head': 0.4 },
      cue: '⏸️ Pause briefly at chest, no bouncing',
    },
    {
      phase: 3,
      name: 'Push Up',
      duration: 1.0,
      muscles: { 'Upper Chest': 0.8, 'Mid Chest': 0.9, 'Front Delt': 0.7, 'Triceps – Long Head': 0.8 },
      cue: '⬆️ Drive through heels, exhale as you press',
    },
    {
      phase: 4,
      name: 'Lockout',
      duration: 0.5,
      muscles: { 'Upper Chest': 0.7, 'Mid Chest': 0.8, 'Triceps – Long Head': 0.9, 'Front Delt': 0.6 },
      cue: '🔒 Lock elbows at top, squeeze chest',
    },
  ],
  'Squats': [
    {
      phase: 0,
      name: 'Starting Position',
      duration: 0.5,
      muscles: { 'Quads': 0.1, 'Glutes': 0.1, 'Hamstrings': 0.05, 'Lower Back': 0.05 },
      cue: '📍 Feet shoulder-width apart, chest up, bar on upper back',
    },
    {
      phase: 1,
      name: 'Descent',
      duration: 1.5,
      muscles: { 'Quads': 0.8, 'Glutes': 0.7, 'Hamstrings': 0.6, 'Lower Back': 0.3 },
      cue: '⬇️ Squat down, knees tracking over toes, chest stays up',
    },
    {
      phase: 2,
      name: 'Bottom',
      duration: 0.5,
      muscles: { 'Quads': 0.9, 'Glutes': 0.9, 'Hamstrings': 0.7, 'Lower Back': 0.4 },
      cue: '💪 At parallel or below, keep core tight',
    },
    {
      phase: 3,
      name: 'Ascent',
      duration: 1.5,
      muscles: { 'Quads': 0.95, 'Glutes': 0.95, 'Hamstrings': 0.5, 'Lower Back': 0.4 },
      cue: '⬆️ Drive through heels, quads leading, exhale',
    },
    {
      phase: 4,
      name: 'Lockout',
      duration: 0.5,
      muscles: { 'Quads': 0.7, 'Glutes': 0.8, 'Hamstrings': 0.3, 'Lower Back': 0.3 },
      cue: '🔒 Full extension at top, glutes engaged',
    },
  ],
  'Push-ups': [
    {
      phase: 0,
      name: 'Starting Position',
      duration: 0.5,
      muscles: { 'Upper Chest': 0.1, 'Triceps – Long Head': 0.1, 'Front Delt': 0.05 },
      cue: '📍 Plank position, hands shoulder-width, body straight line',
    },
    {
      phase: 1,
      name: 'Lowering',
      duration: 1.5,
      muscles: { 'Upper Chest': 0.7, 'Triceps – Long Head': 0.5, 'Front Delt': 0.4 },
      cue: '⬇️ Lower body, chest nearly touches floor, elbows at ~45°',
    },
    {
      phase: 2,
      name: 'Bottom',
      duration: 0.3,
      muscles: { 'Upper Chest': 0.8, 'Triceps – Long Head': 0.6, 'Front Delt': 0.5 },
      cue: '⏸️ Brief pause, core engaged',
    },
    {
      phase: 3,
      name: 'Pressing Up',
      duration: 1.0,
      muscles: { 'Upper Chest': 0.9, 'Triceps – Long Head': 0.8, 'Front Delt': 0.6 },
      cue: '⬆️ Push body up explosively',
    },
  ],
  'Deadlifts': [
    {
      phase: 0,
      name: 'Setup',
      duration: 0.5,
      muscles: { 'Hamstrings': 0.2, 'Glutes': 0.1, 'Lower Back': 0.1 },
      cue: '📍 Feet hip-width, barbell over mid-foot, shoulders over bar',
    },
    {
      phase: 1,
      name: 'Pull Off Floor',
      duration: 1.5,
      muscles: { 'Quads': 0.7, 'Hamstrings': 0.6, 'Glutes': 0.4, 'Lower Back': 0.5 },
      cue: '⬆️ Drive legs, chest stays up, bar stays close',
    },
    {
      phase: 2,
      name: 'Knee Extension',
      duration: 1.0,
      muscles: { 'Quads': 0.5, 'Hamstrings': 0.8, 'Glutes': 0.8, 'Lower Back': 0.6 },
      cue: '🔝 Extend hips powerfully, squeeze glutes',
    },
    {
      phase: 3,
      name: 'Lockout',
      duration: 0.5,
      muscles: { 'Hamstrings': 0.5, 'Glutes': 0.9, 'Lower Back': 0.7 },
      cue: '🔒 Full hip extension, shoulders back, hold 1 second',
    },
    {
      phase: 4,
      name: 'Lower',
      duration: 1.5,
      muscles: { 'Hamstrings': 0.6, 'Glutes': 0.5, 'Lower Back': 0.5, 'Quads': 0.4 },
      cue: '⬇️ Hinge hips back, keep bar close, controlled descent',
    },
  ],
};
