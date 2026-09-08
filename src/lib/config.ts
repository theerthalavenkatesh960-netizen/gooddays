import type { HealthRecommendation } from './api';

// ─── Feature Flags ────────────────────────────────────────────────────────────
// Follows the same envBool pattern as DUMMY_FLAGS in api.ts
function envBool(name: string, fallback: boolean): boolean {
  const raw = (import.meta as any).env?.[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

export const APP_FLAGS = {
  dummyAiAnalysis: envBool('VITE_USE_DUMMY_AI_ANALYSIS', true), // ON by default
  showOnboarding: envBool('VITE_SHOW_ONBOARDING', true),
};

// ─── Dummy AI Analysis Data ───────────────────────────────────────────────────
const weekFrom = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

export const DUMMY_AI_ANALYSIS: HealthRecommendation = {
  dailyCaloriesTarget: 2200,
  budgetPerWeek: 3000,
  activityLevel: 'Moderate',
  dietPreference: 'High-Protein',
  analysis: {
    bmi: 24.5,
    bmr: 1620,
    tdee: 2180,
    feasibility_check: {
      passed: true,
      reason:
        'Your goal is realistic and achievable with consistent effort over 12–14 weeks. A moderate deficit of ~350 kcal/day will ensure muscle is preserved while fat is lost.',
    },
    goal_type: 'cut',
    recommendation: {
      daily_calories: 2200,
      activity_level: 'Moderate',
      macros: { protein_g: 150, carbs_g: 220, fat_g: 78 },
      milestones: [
        { week: 1, date: weekFrom(7), estimated_weight_kg: 75, expected_weight_kg: 75, notes: 'Baseline — establish routine' },
        { week: 4, date: weekFrom(28), estimated_weight_kg: 73.5, expected_weight_kg: 73.5, notes: 'First month — momentum building' },
        { week: 8, date: weekFrom(56), estimated_weight_kg: 72, expected_weight_kg: 72, notes: 'Halfway — review & adjust' },
        { week: 12, date: weekFrom(84), estimated_weight_kg: 70.5, expected_weight_kg: 70.5, notes: 'Goal reached 🎯' },
      ],
      warnings: [
        'Ensure adequate sleep (7–9 hours) for recovery and hormonal balance.',
        'Stay hydrated — drink at least 3 liters of water daily.',
        'Strength training 3–4× per week is essential to retain muscle during cut.',
      ],
    },
    alternative_plan: {
      description:
        'If the deficit feels too aggressive, increase to 2400 kcal/day and extend the timeline to 16–18 weeks. A slower cut is often easier to sustain.',
    },
  },
};

// ─── Onboarding Constants ─────────────────────────────────────────────────────
export const ONBOARDING_FEATURES = [
  { id: 'health', emoji: '🏋️', title: 'Health & Fitness', desc: 'Workouts, body metrics, personalized meal plans' },
  { id: 'finance', emoji: '💰', title: 'Finance', desc: 'Budget tracking & expense management' },
  { id: 'goals', emoji: '🎯', title: 'Goals', desc: 'Set and crush personal objectives' },
  { id: 'journal', emoji: '📔', title: 'Journaling', desc: 'Daily reflections & mood tracking' },
  { id: 'dashboard', emoji: '📊', title: 'Dashboard', desc: 'Unified overview of your life' },
];

export const ACTIVITY_LEVELS = [
  { value: 'Sedentary', label: 'Sedentary', desc: '< 4k steps/day', emoji: '🪑' },
  { value: 'Light', label: 'Light', desc: '4–7k steps/day', emoji: '🚶' },
  { value: 'Moderate', label: 'Moderate', desc: '8–10k steps/day', emoji: '🚴' },
  { value: 'Active', label: 'Active', desc: '1–2 sessions/day', emoji: '🏃' },
  { value: 'Very Active', label: 'Very Active', desc: 'Athlete mode', emoji: '⚡' },
];

export const DIET_PREFERENCES = [
  { value: 'Vegetarian', label: 'Vegetarian', desc: 'Plant-based', emoji: '🥦' },
  { value: 'Non-Veg', label: 'Non-Veg', desc: 'Mixed proteins', emoji: '🍗' },
  { value: 'High-Protein', label: 'High-Protein', desc: 'Lean goals', emoji: '💪' },
  { value: 'Low-Carb', label: 'Low-Carb', desc: 'Glycemic control', emoji: '🥑' },
  { value: 'Mixed', label: 'Mixed', desc: 'Flexible', emoji: '🍽️' },
];

export const WORKOUT_TYPES = [
  { id: 'strength', emoji: '🏋️', name: 'Strength Training', desc: 'Weights & resistance' },
  { id: 'cardio', emoji: '🏃', name: 'Cardio', desc: 'Running, cycling, HIIT' },
  { id: 'flexibility', emoji: '🧘', name: 'Flexibility', desc: 'Yoga & mobility' },
  { id: 'sports', emoji: '⚽', name: 'Sports', desc: 'Basketball, tennis…' },
  { id: 'calisthenics', emoji: '🤸', name: 'Calisthenics', desc: 'Bodyweight moves' },
];

// ─── Muscle Group Taxonomy ────────────────────────────────────────────────────
// MUSCLE_GROUPS_DETAILED: used in add/edit exercise dropdowns.
// MUSCLE_GROUP_FILTER: top-level groups used in filter tabs.
// getMuscleParent: maps a granular group to its top-level parent for filtering.

export const MUSCLE_GROUPS_DETAILED: { parent: string; children: string[] }[] = [
  {
    parent: 'Chest',
    children: ['Upper Chest', 'Mid Chest', 'Lower Chest'],
  },
  {
    parent: 'Back',
    children: ['Lats', 'Upper Traps', 'Rhomboids', 'Lower Back'],
  },
  {
    parent: 'Shoulders',
    children: ['Front Delt', 'Side Delt', 'Rear Delt'],
  },
  {
    parent: 'Arms',
    children: [
      'Biceps – Long Head',
      'Biceps – Short Head',
      'Triceps – Long Head',
      'Triceps – Lateral Head',
      'Triceps – Medial Head',
      'Forearms',
    ],
  },
  {
    parent: 'Legs',
    children: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors'],
  },
  {
    parent: 'Core',
    children: ['Upper Abs', 'Lower Abs', 'Obliques'],
  },
  { parent: 'Cardio', children: [] },
  { parent: 'Full Body', children: [] },
];

/** Flat list of all granular muscle group values for dropdowns. */
export const MUSCLE_GROUPS: string[] = MUSCLE_GROUPS_DETAILED.flatMap(g =>
  g.children.length > 0 ? g.children : [g.parent],
);

/** Top-level parent groups for filter tabs. */
export const MUSCLE_GROUP_FILTER: string[] = MUSCLE_GROUPS_DETAILED.map(g => g.parent);

/** Returns the top-level parent for a given muscle group string (supports legacy broad values). */
export function getMuscleParent(muscleGroup: string): string {
  const mg = muscleGroup.trim();
  for (const group of MUSCLE_GROUPS_DETAILED) {
    if (group.parent === mg) return mg;
    if (group.children.includes(mg)) return group.parent;
  }
  return mg; // unknown — return as-is (backward compat)
}

/** Returns true if an exercise's muscleGroup matches the selected filter. */
export function matchesMuscleFilter(exerciseMuscle: string, filter: string): boolean {
  if (!filter || filter === 'All') return true;
  if (exerciseMuscle === filter) return true;
  return getMuscleParent(exerciseMuscle) === filter;
}

/** Granular muscle name to SVG body part ID mapping for advanced visualization. */
export const MUSCLE_TO_SVG_ID: Record<string, string[]> = {
  'Upper Chest': ['chest-upper-left', 'chest-upper-right'],
  'Mid Chest': ['chest-mid-left', 'chest-mid-right'],
  'Lower Chest': ['chest-lower-left', 'chest-lower-right'],
  'Biceps – Long Head': ['biceps-long-left', 'biceps-long-right'],
  'Biceps – Short Head': ['biceps-short-left', 'biceps-short-right'],
  'Triceps – Long Head': ['triceps-long-left', 'triceps-long-right'],
  'Triceps – Lateral Head': ['triceps-lateral-left', 'triceps-lateral-right'],
  'Triceps – Medial Head': ['triceps-medial-left', 'triceps-medial-right'],
  'Forearms': ['forearm-left', 'forearm-right'],
  'Front Delt': ['shoulder-front-left', 'shoulder-front-right'],
  'Side Delt': ['shoulder-side-left', 'shoulder-side-right'],
  'Rear Delt': ['shoulder-rear-left', 'shoulder-rear-right'],
  'Lats': ['lats-left', 'lats-right'],
  'Upper Traps': ['traps-left', 'traps-right'],
  'Rhomboids': ['rhomboids-left', 'rhomboids-right'],
  'Lower Back': ['lower-back-left', 'lower-back-right'],
  'Quads': ['quads-left', 'quads-right'],
  'Hamstrings': ['hamstrings-left', 'hamstrings-right'],
  'Glutes': ['glutes-left', 'glutes-right'],
  'Calves': ['calves-left', 'calves-right'],
  'Hip Flexors': ['hip-flexor-left', 'hip-flexor-right'],
  'Upper Abs': ['abs-upper'],
  'Lower Abs': ['abs-lower'],
  'Obliques': ['obliques-left', 'obliques-right'],
};

export const MEAL_PREFERENCES = [
  { id: 'home-cooked', emoji: '🍳', name: 'Home Cooked', desc: 'Prepare own meals' },
  { id: 'meal-prep', emoji: '🍱', name: 'Meal Prep', desc: 'Batch cook weekly' },
  { id: 'convenience', emoji: '🥗', name: 'Convenience', desc: 'Quick ready-made' },
  { id: 'calorie-counting', emoji: '📊', name: 'Calorie Counting', desc: 'Strict tracking' },
  { id: 'whole-foods', emoji: '🌾', name: 'Whole Foods', desc: 'Natural ingredients' },
];

export const CALORIE_PRESETS = [
  { value: '1500', label: '1500', desc: 'Aggressive cut' },
  { value: '1800', label: '1800', desc: 'Moderate cut' },
  { value: '2000', label: '2000', desc: 'Balanced / recomp' },
  { value: '2400', label: '2400', desc: 'Performance' },
  { value: '3000', label: '3000+', desc: 'Bulk / gain' },
];

export const BUDGET_PRESETS = [
  { value: '1000', label: '₹1000', desc: 'Essentials' },
  { value: '2000', label: '₹2000', desc: 'Balanced' },
  { value: '4000', label: '₹4000', desc: 'More variety' },
  { value: '6000', label: '₹6000', desc: 'Quality focus' },
  { value: '10000', label: 'No cap', desc: 'Best fit recs' },
];

/** Formats a transaction date/time into a human friendly string like "Sep 3rd, 6:32 am". */
export function formatTxDateTime(raw: string | Date | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';

  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                 (day % 10 === 2 && day !== 12) ? 'nd' :
                 (day % 10 === 3 && day !== 13) ? 'rd' : 'th';

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hasTime = !(hours === 0 && minutes === 0 && d.getSeconds() === 0);
  if (!hasTime) {
    return `${month} ${day}${suffix}`;
  }

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${month} ${day}${suffix}, ${time}`;
}

