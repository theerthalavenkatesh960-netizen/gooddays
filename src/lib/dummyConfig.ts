/**
 * Centralized Dummy Data Configuration
 * All dummy/test flags are managed here
 * Set to false to use real API endpoints
 */

// Master flag - controls all dummy data globally
export const USE_DUMMY_DATA = true;

// Feature-specific dummy flags (all inherit from USE_DUMMY_DATA unless overridden)
export const USE_DUMMY_DAILY_ROUTINE_DATA = USE_DUMMY_DATA;
export const USE_DUMMY_FINANCE = USE_DUMMY_DATA;
export const USE_DUMMY_MEALS = USE_DUMMY_DATA;
export const USE_DUMMY_WORKOUTS = USE_DUMMY_DATA;
export const USE_DUMMY_GOALS = USE_DUMMY_DATA;
export const USE_DUMMY_VEHICLES = USE_DUMMY_DATA;
export const USE_DUMMY_WATER = USE_DUMMY_DATA;
export const USE_DUMMY_BODY_METRICS = USE_DUMMY_DATA;
export const USE_DUMMY_QUICK_LOG = USE_DUMMY_DATA;
export const USE_DUMMY_SETTINGS = USE_DUMMY_DATA;

// Individual overrides (uncomment to override global USE_DUMMY_DATA)
// export const USE_DUMMY_FINANCE = false;
// export const USE_DUMMY_WORKOUTS = false;
// export const USE_DUMMY_MEALS = false;

// Helper function to check if dummy data should be used for a feature
export function shouldUseDummyData(feature: string): boolean {
  const featureName = `USE_DUMMY_${feature.toUpperCase()}`;
  return (module.exports[featureName] !== undefined) ? module.exports[featureName] : USE_DUMMY_DATA;
}
