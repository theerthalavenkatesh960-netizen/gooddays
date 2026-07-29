using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services;

public class WeeklyGoalAdjustmentService
{
    private readonly AppDbContext _db;
    private readonly MealMacroCalculatorService _macroCalculator;

    public WeeklyGoalAdjustmentService(AppDbContext db, MealMacroCalculatorService macroCalculator)
    {
        _db = db;
        _macroCalculator = macroCalculator;
    }

    public async Task<WeeklyRecommendationResult> GenerateAsync(
        int userId,
        DateTime weekStart,
        WeeklyRecommendationGenerateRequest? request = null)
    {
        var startDate = weekStart.Date;
        var endDate = startDate.AddDays(7);
        var startDateOnly = DateOnly.FromDateTime(startDate);
        var endDateOnly = DateOnly.FromDateTime(endDate);
        var previousWeekStart = startDate.AddDays(-7);
        var targetWeekStart = request?.ForNextWeek == false ? startDate : startDate.AddDays(7);
        var filters = request?.Filters ?? new WeeklyRecommendationFilters();

        var healthProfile = await _db.UserHealthProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var mealTemplates = await _db.MealTemplates
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToListAsync();

        var filteredTemplates = ApplyMealTemplateFilters(mealTemplates, filters);
        var templateMacroMap = await BuildTemplateMacroMapAsync(filteredTemplates);
        var templateIds = templateMacroMap.Keys.ToHashSet();

        var mealLogs = await _db.DailyMealLogs
            .AsNoTracking()
            .Where(l => l.UserId == userId && l.Date >= startDateOnly && l.Date < endDateOnly)
            .ToListAsync();

        var weeklyPlan = await _db.WeeklyMealPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);
        var planData = ParsePlanJson(weeklyPlan?.PlanJson);

        var dailyMealRows = BuildDailyMealRows(startDateOnly, planData, mealLogs, templateIds, templateMacroMap);

        var plannedWeeklyCalories = dailyMealRows.Sum(r => r.PlannedCalories);
        var actualWeeklyCalories = dailyMealRows.Sum(r => r.ActualCalories);
        var plannedProtein = dailyMealRows.Sum(r => r.PlannedProteinG);
        var actualProtein = dailyMealRows.Sum(r => r.ActualProteinG);
        var plannedCarbs = dailyMealRows.Sum(r => r.PlannedCarbsG);
        var actualCarbs = dailyMealRows.Sum(r => r.ActualCarbsG);
        var plannedFats = dailyMealRows.Sum(r => r.PlannedFatsG);
        var actualFats = dailyMealRows.Sum(r => r.ActualFatsG);

        var plannedMeals = dailyMealRows.Sum(r => r.PlannedMealCount);
        var matchedMeals = dailyMealRows.Sum(r => r.MatchedPlannedMealCount);
        var mealAdherence = RatioOrZero(matchedMeals, plannedMeals);

        var calorieTargetWeekly = (healthProfile?.DailyCaloriesTarget ?? 0) > 0
            ? (healthProfile!.DailyCaloriesTarget!.Value * 7)
            : 0;
        var calorieAdherence = calorieTargetWeekly > 0
            ? Closeness(actualWeeklyCalories, calorieTargetWeekly)
            : 0;

        var macroAdherence = BuildMacroAdherence(actualWeeklyCalories, actualProtein, actualCarbs, actualFats);

        var workoutPlans = await _db.WorkoutDayPlans
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.Date >= startDate && p.Date < endDate)
            .ToListAsync();

        var plannedWorkoutDays = workoutPlans.Count;
        var completedWorkoutDays = workoutPlans.Count(p => p.IsCompleted);
        var workoutAdherence = RatioOrZero(completedWorkoutDays, plannedWorkoutDays);

        var currentWeekVolume = await _db.WorkoutSets
            .AsNoTracking()
            .Include(s => s.WorkoutDayPlan)
            .Where(s => s.WorkoutDayPlan.UserId == userId
                && s.WorkoutDayPlan.Date >= startDate
                && s.WorkoutDayPlan.Date < endDate
                && s.IsCompleted)
            .SumAsync(s => (s.WeightKg ?? 0) * (s.Reps ?? 0));

        var previousWeekVolume = await _db.WorkoutSets
            .AsNoTracking()
            .Include(s => s.WorkoutDayPlan)
            .Where(s => s.WorkoutDayPlan.UserId == userId
                && s.WorkoutDayPlan.Date >= previousWeekStart
                && s.WorkoutDayPlan.Date < startDate
                && s.IsCompleted)
            .SumAsync(s => (s.WeightKg ?? 0) * (s.Reps ?? 0));

        var prCount = await _db.PersonalRecords
            .AsNoTracking()
            .CountAsync(pr => pr.UserId == userId && pr.AchievedAt >= startDate && pr.AchievedAt < endDate);

        var strengthProgress = BuildStrengthProgress(currentWeekVolume, previousWeekVolume, prCount);

        var weightProgress = await BuildWeightProgressAsync(userId, startDateOnly, healthProfile);

        var recommendations = BuildRecommendations(
            mealAdherence,
            calorieAdherence,
            macroAdherence.Score,
            workoutAdherence,
            strengthProgress.Score,
            weightProgress,
            healthProfile,
            plannedWorkoutDays);

        var suggestedPlans = await BuildSuggestedPlansAsync(
            userId,
            targetWeekStart,
            weeklyPlan?.PlanJson,
            filteredTemplates,
            filters);

        return new WeeklyRecommendationResult
        {
            WeekStart = startDateOnly.ToString("yyyy-MM-dd"),
            TargetWeekStart = DateOnly.FromDateTime(targetWeekStart).ToString("yyyy-MM-dd"),
            GeneratedAt = DateTime.UtcNow,
            Mode = "recommend-only",
            Filters = filters,
            Signals = new WeeklySignals
            {
                MealAdherence = mealAdherence,
                CalorieAdherence = calorieAdherence,
                MacroAdherence = macroAdherence,
                WorkoutAdherence = workoutAdherence,
                StrengthProgress = strengthProgress,
                WeightProgress = weightProgress,
            },
            Summary = new WeeklySignalSummary
            {
                DailyCaloriesTarget = healthProfile?.DailyCaloriesTarget,
                PlannedWeeklyCalories = plannedWeeklyCalories,
                ActualWeeklyCalories = actualWeeklyCalories,
                PlannedWorkoutDays = plannedWorkoutDays,
                CompletedWorkoutDays = completedWorkoutDays,
                WeeklyVolume = Math.Round(currentWeekVolume, 2),
                PreviousWeeklyVolume = Math.Round(previousWeekVolume, 2),
                PrCount = prCount,
            },
            DailyNutrition = dailyMealRows,
            Recommendations = recommendations,
            SuggestedPlans = suggestedPlans,
        };
    }

    private async Task<Dictionary<int, MacroTotals>> BuildTemplateMacroMapAsync(IEnumerable<MealTemplate> mealTemplates)
    {
        var map = new Dictionary<int, MacroTotals>();
        foreach (var template in mealTemplates)
        {
            var (cal, protein, carbs, fats) = await _macroCalculator.CalculateMealMacrosAsync(template.IngredientsJson);
            map[template.Id] = new MacroTotals(cal, protein, carbs, fats);
        }

        return map;
    }

    private static List<MealTemplate> ApplyMealTemplateFilters(
        IReadOnlyCollection<MealTemplate> templates,
        WeeklyRecommendationFilters filters)
    {
        var includeIds = (filters.IncludeMealTemplateIds ?? new List<int>()).Where(x => x > 0).ToHashSet();
        var excludeIds = (filters.ExcludeMealTemplateIds ?? new List<int>()).Where(x => x > 0).ToHashSet();
        var includeNames = (filters.IncludeMealNames ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToList();
        var excludeNames = (filters.ExcludeMealNames ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToList();

        var rows = templates.Where(t => !excludeIds.Contains(t.Id)).ToList();
        if (excludeNames.Count > 0)
        {
            rows = rows.Where(t => !excludeNames.Any(n => t.Name.Contains(n, StringComparison.OrdinalIgnoreCase))).ToList();
        }

        if (includeIds.Count == 0 && includeNames.Count == 0)
        {
            return rows;
        }

        return rows
            .Where(t => includeIds.Contains(t.Id) || includeNames.Any(n => t.Name.Contains(n, StringComparison.OrdinalIgnoreCase)))
            .ToList();
    }

    private async Task<SuggestedPlans> BuildSuggestedPlansAsync(
        int userId,
        DateTime targetWeekStart,
        string? weeklyMealPlanJson,
        IReadOnlyCollection<MealTemplate> filteredTemplates,
        WeeklyRecommendationFilters filters)
    {
        var mealPlan = BuildSuggestedMealPlan(targetWeekStart, weeklyMealPlanJson, filteredTemplates);

        var exercises = await _db.Exercises
            .AsNoTracking()
            .Where(e => e.UserId == userId || !e.IsCustom)
            .ToListAsync();
        var exerciseLookup = exercises.ToDictionary(e => e.Id);

        var activeSplit = await _db.WorkoutSplitPresets
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.IsActive)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        var workoutPlan = BuildSuggestedWorkoutPlan(targetWeekStart, activeSplit?.DayConfigs, exerciseLookup, filters);

        return new SuggestedPlans
        {
            MealPlan = mealPlan,
            WorkoutRoutine = workoutPlan,
        };
    }

    private static Dictionary<string, List<MealSuggestion>> BuildSuggestedMealPlan(
        DateTime targetWeekStart,
        string? weeklyMealPlanJson,
        IReadOnlyCollection<MealTemplate> filteredTemplates)
    {
        var fallbackByTiming = filteredTemplates
            .GroupBy(t => (t.Timing ?? "").Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.Select(t => t.Id).Distinct().ToList());
        var source = ParsePlanAssignments(weeklyMealPlanJson);
        var result = new Dictionary<string, List<MealSuggestion>>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < 7; i++)
        {
            var date = DateOnly.FromDateTime(targetWeekStart).AddDays(i);
            var dateKey = date.ToString("yyyy-MM-dd");
            var sourceDate = date.AddDays(-7).ToString("yyyy-MM-dd");
            var dayKey = date.DayOfWeek.ToString().ToLowerInvariant();
            var sourceDayKey = date.AddDays(-7).DayOfWeek.ToString().ToLowerInvariant();

            var baseAssignments = source.TryGetValue(sourceDate, out var byDate)
                ? byDate
                : source.TryGetValue(sourceDayKey, out var bySourceDay)
                    ? bySourceDay
                    : source.TryGetValue(dayKey, out var byDay)
                        ? byDay
                        : new List<MealSuggestion>();

            var dayMeals = baseAssignments
                .Where(x => filteredTemplates.Any(t => t.Id == x.MealTemplateId))
                .ToList();

            if (dayMeals.Count == 0)
            {
                var fallback = new List<MealSuggestion>();
                if (fallbackByTiming.TryGetValue("breakfast", out var breakfasts) && breakfasts.Count > 0)
                    fallback.Add(new MealSuggestion { MealTemplateId = breakfasts[0], TimeOfDay = "08:00" });
                if (fallbackByTiming.TryGetValue("lunch", out var lunches) && lunches.Count > 0)
                    fallback.Add(new MealSuggestion { MealTemplateId = lunches[0], TimeOfDay = "13:00" });
                if (fallbackByTiming.TryGetValue("dinner", out var dinners) && dinners.Count > 0)
                    fallback.Add(new MealSuggestion { MealTemplateId = dinners[0], TimeOfDay = "20:00" });

                dayMeals = fallback;
            }

            result[dateKey] = dayMeals
                .DistinctBy(x => x.MealTemplateId)
                .ToList();
        }

        return result;
    }

    private static Dictionary<string, List<WorkoutSuggestion>> BuildSuggestedWorkoutPlan(
        DateTime targetWeekStart,
        string? dayConfigs,
        IReadOnlyDictionary<int, Exercise> exerciseLookup,
        WeeklyRecommendationFilters filters)
    {
        var includeIds = (filters.IncludeExerciseIds ?? new List<int>()).Where(x => x > 0).ToHashSet();
        var excludeIds = (filters.ExcludeExerciseIds ?? new List<int>()).Where(x => x > 0).ToHashSet();
        var includeMuscleGroups = (filters.IncludeMuscleGroups ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .ToHashSet();
        var excludeMuscleGroups = (filters.ExcludeMuscleGroups ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .ToHashSet();

        var source = ParseWorkoutDayConfigs(dayConfigs);
        var result = new Dictionary<string, List<WorkoutSuggestion>>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < 7; i++)
        {
            var day = DateOnly.FromDateTime(targetWeekStart).AddDays(i).DayOfWeek.ToString().ToLowerInvariant();
            var sourceEntries = source.TryGetValue(day, out var dayEntries) ? dayEntries : new List<WorkoutSuggestion>();

            var filtered = sourceEntries
                .Where(x => !excludeIds.Contains(x.ExerciseId))
                .Where(x =>
                {
                    if (!exerciseLookup.TryGetValue(x.ExerciseId, out var ex)) return false;
                    var group = (ex.MuscleGroup ?? string.Empty).Trim().ToLowerInvariant();
                    if (excludeMuscleGroups.Contains(group)) return false;
                    if (includeIds.Count == 0 && includeMuscleGroups.Count == 0) return true;
                    return includeIds.Contains(x.ExerciseId) || includeMuscleGroups.Contains(group);
                })
                .ToList();

            if (includeIds.Count > 0 && filtered.Count == 0)
            {
                var includeFallback = includeIds
                    .Where(exerciseLookup.ContainsKey)
                    .Take(2)
                    .Select(id => new WorkoutSuggestion { ExerciseId = id, Sets = 3, Reps = 10 })
                    .ToList();
                filtered = includeFallback;
            }

            result[day] = filtered;
        }

        return result;
    }

    private static Dictionary<string, List<MealSuggestion>> ParsePlanAssignments(string? planJson)
    {
        var result = new Dictionary<string, List<MealSuggestion>>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(planJson)) return result;

        try
        {
            using var doc = JsonDocument.Parse(planJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return result;

            foreach (var day in doc.RootElement.EnumerateObject())
            {
                var items = new List<MealSuggestion>();
                if (day.Value.ValueKind != JsonValueKind.Array)
                {
                    result[day.Name] = items;
                    continue;
                }

                foreach (var item in day.Value.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var id) && id > 0)
                    {
                        items.Add(new MealSuggestion { MealTemplateId = id });
                        continue;
                    }

                    if (item.ValueKind != JsonValueKind.Object) continue;
                    if (!TryGetMealTemplateId(item, out var mealId) || mealId <= 0) continue;

                    string? time = null;
                    foreach (var prop in item.EnumerateObject())
                    {
                        var key = prop.Name.ToLowerInvariant();
                        if (key is "timeofday" or "time_of_day")
                        {
                            time = prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : null;
                        }
                    }
                    items.Add(new MealSuggestion { MealTemplateId = mealId, TimeOfDay = time });
                }

                result[day.Name] = items;
            }
        }
        catch
        {
            return new Dictionary<string, List<MealSuggestion>>(StringComparer.OrdinalIgnoreCase);
        }

        return result;
    }

    private static Dictionary<string, List<WorkoutSuggestion>> ParseWorkoutDayConfigs(string? dayConfigs)
    {
        var result = new Dictionary<string, List<WorkoutSuggestion>>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(dayConfigs)) return result;

        try
        {
            using var doc = JsonDocument.Parse(dayConfigs);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return result;

            foreach (var day in doc.RootElement.EnumerateObject())
            {
                var dayKey = day.Name.Trim().ToLowerInvariant();
                var entries = new List<WorkoutSuggestion>();

                if (day.Value.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in day.Value.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var id) && id > 0)
                        {
                            entries.Add(new WorkoutSuggestion { ExerciseId = id, Sets = 3, Reps = 10 });
                            continue;
                        }

                        if (item.ValueKind != JsonValueKind.Object) continue;

                        int exerciseId = 0;
                        var sets = 3;
                        var reps = 10;
                        foreach (var prop in item.EnumerateObject())
                        {
                            var key = prop.Name.ToLowerInvariant();
                            if ((key == "exerciseid" || key == "exercise_id") && prop.Value.TryGetInt32(out var eid))
                            {
                                exerciseId = eid;
                            }
                            else if (key == "sets" && prop.Value.TryGetInt32(out var s))
                            {
                                sets = Math.Max(1, s);
                            }
                            else if (key == "reps" && prop.Value.TryGetInt32(out var r))
                            {
                                reps = Math.Max(1, r);
                            }
                            else if (key == "exerciseids" && prop.Value.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var idNode in prop.Value.EnumerateArray())
                                {
                                    if (idNode.TryGetInt32(out var directId) && directId > 0)
                                    {
                                        entries.Add(new WorkoutSuggestion { ExerciseId = directId, Sets = sets, Reps = reps });
                                    }
                                }
                            }
                        }

                        if (exerciseId > 0)
                        {
                            entries.Add(new WorkoutSuggestion { ExerciseId = exerciseId, Sets = sets, Reps = reps });
                        }
                    }
                }

                result[dayKey] = entries;
            }
        }
        catch
        {
            return new Dictionary<string, List<WorkoutSuggestion>>(StringComparer.OrdinalIgnoreCase);
        }

        return result;
    }

    private static Dictionary<string, List<int>> ParsePlanJson(string? planJson)
    {
        var result = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(planJson)) return result;

        try
        {
            using var doc = JsonDocument.Parse(planJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return result;

            foreach (var day in doc.RootElement.EnumerateObject())
            {
                var ids = new List<int>();
                if (day.Value.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in day.Value.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var rawId) && rawId > 0)
                        {
                            ids.Add(rawId);
                            continue;
                        }

                        if (item.ValueKind != JsonValueKind.Object) continue;
                        if (TryGetMealTemplateId(item, out var id) && id > 0)
                        {
                            ids.Add(id);
                        }
                    }
                }

                result[day.Name] = ids;
            }
        }
        catch
        {
            return new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        }

        return result;
    }

    private static bool TryGetMealTemplateId(JsonElement element, out int id)
    {
        id = 0;
        foreach (var prop in element.EnumerateObject())
        {
            var key = prop.Name.ToLowerInvariant();
            if (key is not ("mealtemplateid" or "meal_template_id")) continue;
            if (prop.Value.ValueKind == JsonValueKind.Number)
            {
                return prop.Value.TryGetInt32(out id);
            }

            if (prop.Value.ValueKind == JsonValueKind.String)
            {
                return int.TryParse(prop.Value.GetString(), out id);
            }
        }

        return false;
    }

    private static List<DailyNutritionRow> BuildDailyMealRows(
        DateOnly weekStart,
        IReadOnlyDictionary<string, List<int>> planData,
        IEnumerable<DailyMealLog> mealLogs,
        ISet<int> validTemplateIds,
        IReadOnlyDictionary<int, MacroTotals> templateMacroMap)
    {
        var logsByDate = mealLogs.ToDictionary(l => l.Date, l => DeserializeMealIds(l.MealIdsJson));
        var rows = new List<DailyNutritionRow>(7);

        for (var i = 0; i < 7; i++)
        {
            var date = weekStart.AddDays(i);
            var dateKey = date.ToString("yyyy-MM-dd");
            var dayKey = date.DayOfWeek.ToString().ToLowerInvariant();
            var plannedIds = (planData.TryGetValue(dateKey, out var fromDate)
                    ? fromDate
                    : planData.TryGetValue(dayKey, out var fromDay)
                        ? fromDay
                        : new List<int>())
                .Where(validTemplateIds.Contains)
                .Distinct()
                .ToList();

            var actualIds = logsByDate.TryGetValue(date, out var logged) ? logged : new List<int>();
            actualIds = actualIds.Where(validTemplateIds.Contains).Distinct().ToList();

            var plannedMacros = SumMacros(plannedIds, templateMacroMap);
            var actualMacros = SumMacros(actualIds, templateMacroMap);
            var matchedPlanned = plannedIds.Intersect(actualIds).Count();

            rows.Add(new DailyNutritionRow
            {
                Date = dateKey,
                PlannedMealCount = plannedIds.Count,
                LoggedMealCount = actualIds.Count,
                MatchedPlannedMealCount = matchedPlanned,
                PlannedCalories = plannedMacros.Calories,
                ActualCalories = actualMacros.Calories,
                PlannedProteinG = Math.Round(plannedMacros.ProteinG, 2),
                ActualProteinG = Math.Round(actualMacros.ProteinG, 2),
                PlannedCarbsG = Math.Round(plannedMacros.CarbsG, 2),
                ActualCarbsG = Math.Round(actualMacros.CarbsG, 2),
                PlannedFatsG = Math.Round(plannedMacros.FatsG, 2),
                ActualFatsG = Math.Round(actualMacros.FatsG, 2),
            });
        }

        return rows;
    }

    private static List<int> DeserializeMealIds(JsonDocument json)
    {
        try
        {
            return json.RootElement.Deserialize<List<int>>() ?? new List<int>();
        }
        catch
        {
            return new List<int>();
        }
    }

    private static MacroTotals SumMacros(IEnumerable<int> mealTemplateIds, IReadOnlyDictionary<int, MacroTotals> macroMap)
    {
        var calories = 0;
        var protein = 0d;
        var carbs = 0d;
        var fats = 0d;

        foreach (var id in mealTemplateIds)
        {
            if (!macroMap.TryGetValue(id, out var macros)) continue;
            calories += macros.Calories;
            protein += macros.ProteinG;
            carbs += macros.CarbsG;
            fats += macros.FatsG;
        }

        return new MacroTotals(calories, protein, carbs, fats);
    }

    private static MacroSignal BuildMacroAdherence(int weeklyCalories, double proteinG, double carbsG, double fatsG)
    {
        if (weeklyCalories <= 0)
        {
            return new MacroSignal
            {
                Score = 0,
                ProteinRatio = 0,
                CarbsRatio = 0,
                FatsRatio = 0,
            };
        }

        var proteinCalories = proteinG * 4;
        var carbsCalories = carbsG * 4;
        var fatsCalories = fatsG * 9;

        var proteinRatio = proteinCalories / weeklyCalories;
        var carbsRatio = carbsCalories / weeklyCalories;
        var fatsRatio = fatsCalories / weeklyCalories;

        // Baseline macro split for v1 heuristics.
        const double proteinTarget = 0.30;
        const double carbsTarget = 0.40;
        const double fatsTarget = 0.30;

        var proteinScore = ClosenessRatio(proteinRatio, proteinTarget);
        var carbsScore = ClosenessRatio(carbsRatio, carbsTarget);
        var fatsScore = ClosenessRatio(fatsRatio, fatsTarget);

        return new MacroSignal
        {
            Score = Math.Round((proteinScore + carbsScore + fatsScore) / 3.0, 3),
            ProteinRatio = Math.Round(proteinRatio, 3),
            CarbsRatio = Math.Round(carbsRatio, 3),
            FatsRatio = Math.Round(fatsRatio, 3),
        };
    }

    private static StrengthSignal BuildStrengthProgress(decimal currentWeekVolume, decimal previousWeekVolume, int prCount)
    {
        if (previousWeekVolume <= 0)
        {
            var initialScore = currentWeekVolume > 0 ? 0.7 : 0.5;
            return new StrengthSignal
            {
                Score = Math.Round(Clamp01(initialScore + (prCount > 0 ? 0.1 : 0)), 3),
                VolumeChangeRatio = currentWeekVolume > 0 ? 1 : 0,
                PrCount = prCount,
            };
        }

        var change = (double)((currentWeekVolume - previousWeekVolume) / previousWeekVolume);
        var baseScore = change switch
        {
            >= 0.08 => 0.9,
            >= 0.02 => 0.8,
            >= -0.03 => 0.65,
            >= -0.10 => 0.45,
            _ => 0.25,
        };
        var prBoost = Math.Min(0.12, prCount * 0.03);

        return new StrengthSignal
        {
            Score = Math.Round(Clamp01(baseScore + prBoost), 3),
            VolumeChangeRatio = Math.Round(change, 3),
            PrCount = prCount,
        };
    }

    private async Task<WeightSignal> BuildWeightProgressAsync(int userId, DateOnly startDate, UserHealthProfile? healthProfile)
    {
        var previousWeekStart = startDate.AddDays(-7);
        var endDate = startDate.AddDays(7);

        var relevantLogs = await _db.BodyWeightLogs
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.Date >= previousWeekStart && w.Date < endDate)
            .OrderBy(w => w.Date)
            .ToListAsync();

        var currentWeek = relevantLogs.Where(w => w.Date >= startDate && w.Date < endDate).ToList();
        var previousWeek = relevantLogs.Where(w => w.Date >= previousWeekStart && w.Date < startDate).ToList();

        var currentAvg = currentWeek.Count > 0 ? (double)currentWeek.Average(w => w.WeightKg) : (double?)null;
        var previousAvg = previousWeek.Count > 0 ? (double)previousWeek.Average(w => w.WeightKg) : (double?)null;
        var targetWeight = (double?)healthProfile?.TargetWeightKg;
        var baselineWeight = (double?)healthProfile?.WeightKg;

        if (!currentAvg.HasValue || !previousAvg.HasValue || !targetWeight.HasValue || !baselineWeight.HasValue)
        {
            return new WeightSignal
            {
                Score = 0,
                WeeklyChangeKg = currentAvg.HasValue && previousAvg.HasValue
                    ? Math.Round(currentAvg.Value - previousAvg.Value, 3)
                    : 0,
                TargetDirection = ResolveDirectionLabel(baselineWeight, targetWeight),
                CurrentAverageKg = currentAvg,
                PreviousAverageKg = previousAvg,
                TargetWeightKg = targetWeight,
                HasEnoughData = false,
            };
        }

        var direction = targetWeight.Value - baselineWeight.Value;
        var change = currentAvg.Value - previousAvg.Value;

        // If target is lower, expected weekly change is negative, otherwise positive.
        var isOnTrack = direction == 0
            ? Math.Abs(change) <= 0.2
            : Math.Sign(change) == Math.Sign(direction);

        var magnitudeScore = direction == 0
            ? Closeness(Math.Abs(change), 0.0)
            : Closeness(Math.Abs(change), 0.35);
        var directionScore = isOnTrack ? 1.0 : 0.25;

        return new WeightSignal
        {
            Score = Math.Round((directionScore * 0.6) + (magnitudeScore * 0.4), 3),
            WeeklyChangeKg = Math.Round(change, 3),
            TargetDirection = ResolveDirectionLabel(baselineWeight, targetWeight),
            CurrentAverageKg = Math.Round(currentAvg.Value, 2),
            PreviousAverageKg = Math.Round(previousAvg.Value, 2),
            TargetWeightKg = Math.Round(targetWeight.Value, 2),
            HasEnoughData = true,
        };
    }

    private static List<RecommendationItem> BuildRecommendations(
        double mealAdherence,
        double calorieAdherence,
        double macroAdherence,
        double workoutAdherence,
        double strengthScore,
        WeightSignal weight,
        UserHealthProfile? profile,
        int plannedWorkoutDays)
    {
        var items = new List<RecommendationItem>();

        if (mealAdherence < 0.7)
        {
            items.Add(new RecommendationItem
            {
                Domain = "meals",
                Priority = "high",
                Title = "Improve meal plan adherence",
                ProposedChange = "Reduce complexity for next week: repeat 1 to 2 anchor meals on weekdays and keep one flexible slot.",
                Rationale = "Logged meals covered fewer than 70% of planned meals, so simplification should increase consistency before harder adjustments.",
                Confidence = Math.Round(1 - mealAdherence, 3),
            });
        }

        if ((profile?.DailyCaloriesTarget ?? 0) > 0)
        {
            if (calorieAdherence < 0.75)
            {
                items.Add(new RecommendationItem
                {
                    Domain = "meals",
                    Priority = "high",
                    Title = "Calorie adherence correction",
                    ProposedChange = "Adjust next week by adding/removing one snack-sized meal block on low-adherence days.",
                    Rationale = "Actual weekly calories deviated significantly from target, so a small structured meal-block adjustment is safer than a full plan rewrite.",
                    Confidence = Math.Round(1 - calorieAdherence, 3),
                });
            }
            else if (calorieAdherence < 0.9)
            {
                items.Add(new RecommendationItem
                {
                    Domain = "meals",
                    Priority = "medium",
                    Title = "Tighten calorie consistency",
                    ProposedChange = "Keep current meal set but standardize portions for 2 meals per day.",
                    Rationale = "Calories are close to target but still drifting; portion consistency should stabilize progress.",
                    Confidence = Math.Round(1 - calorieAdherence, 3),
                });
            }
        }

        if (macroAdherence < 0.75)
        {
            items.Add(new RecommendationItem
            {
                Domain = "meals",
                Priority = "medium",
                Title = "Macro balance correction",
                ProposedChange = "Swap one daily meal toward higher protein and moderate carb density to better align macro split.",
                Rationale = "Macro distribution is outside desired range, which can reduce training recovery and weight-goal alignment.",
                Confidence = Math.Round(1 - macroAdherence, 3),
            });
        }

        if (workoutAdherence < 0.65)
        {
            items.Add(new RecommendationItem
            {
                Domain = "workout",
                Priority = "high",
                Title = "Raise workout adherence",
                ProposedChange = plannedWorkoutDays >= 5
                    ? "Temporarily reduce planned sessions by 1 day and prioritize core compound lifts."
                    : "Keep session count but shorten each workout with a minimum viable routine.",
                Rationale = "Planned-vs-completed workout adherence was low, so reducing friction is the fastest path to consistency.",
                Confidence = Math.Round(1 - workoutAdherence, 3),
            });
        }

        if (strengthScore < 0.5 && workoutAdherence >= 0.65)
        {
            items.Add(new RecommendationItem
            {
                Domain = "workout",
                Priority = "medium",
                Title = "Deload or recover",
                ProposedChange = "Use a light deload for 1 week: reduce volume by ~15% and resume progression after recovery markers improve.",
                Rationale = "Adherence is acceptable but strength trend is weak, which suggests fatigue or recovery bottlenecks.",
                Confidence = Math.Round(1 - strengthScore, 3),
            });
        }
        else if (strengthScore > 0.8 && workoutAdherence > 0.75)
        {
            items.Add(new RecommendationItem
            {
                Domain = "workout",
                Priority = "medium",
                Title = "Progressive overload opportunity",
                ProposedChange = "Increase working-set difficulty slightly next week (small load jump or +1 set on primary lift days).",
                Rationale = "Strength and adherence both look strong, so a small progression step is justified.",
                Confidence = Math.Round(Math.Min(strengthScore, workoutAdherence), 3),
            });
        }

        if (weight.HasEnoughData)
        {
            if (weight.Score < 0.5)
            {
                items.Add(new RecommendationItem
                {
                    Domain = "weight",
                    Priority = "high",
                    Title = "Weight trend misalignment",
                    ProposedChange = "Apply conservative meal + training adjustment and re-check bodyweight trend after 7 days.",
                    Rationale = "Weekly weight direction does not match target direction, so moderate corrections are needed.",
                    Confidence = Math.Round(1 - weight.Score, 3),
                });
            }
        }
        else
        {
            items.Add(new RecommendationItem
            {
                Domain = "weight",
                Priority = "low",
                Title = "More weigh-ins needed",
                ProposedChange = "Log bodyweight at least 3 times next week (morning, same conditions) to unlock better weight adjustments.",
                Rationale = "Insufficient weight data this week reduces confidence for weight-target adjustments.",
                Confidence = 0.9,
            });
        }

        if (items.Count == 0)
        {
            items.Add(new RecommendationItem
            {
                Domain = "overall",
                Priority = "low",
                Title = "Stay the course",
                ProposedChange = "Keep current meal and workout structure for one more week with only minor progression tweaks.",
                Rationale = "Current adherence and progress signals are stable, so major changes are unnecessary.",
                Confidence = 0.8,
            });
        }

        return items;
    }

    private static string ResolveDirectionLabel(double? baselineWeight, double? targetWeight)
    {
        if (!baselineWeight.HasValue || !targetWeight.HasValue) return "unknown";
        if (Math.Abs(targetWeight.Value - baselineWeight.Value) < 0.05) return "maintain";
        return targetWeight.Value > baselineWeight.Value ? "gain" : "lose";
    }

    private static double RatioOrZero(int numerator, int denominator)
    {
        if (denominator <= 0) return 0;
        return Math.Round((double)numerator / denominator, 3);
    }

    private static double Closeness(double value, double target)
    {
        if (target <= 0) return value <= 0 ? 1 : 0;
        var deviation = Math.Abs(value - target) / target;
        return Math.Round(Clamp01(1 - deviation), 3);
    }

    private static double ClosenessRatio(double value, double target)
    {
        if (target <= 0) return value <= 0 ? 1 : 0;
        var deviation = Math.Abs(value - target) / target;
        return Clamp01(1 - deviation);
    }

    private static double Clamp01(double value) => Math.Max(0, Math.Min(1, value));

    private sealed record MacroTotals(int Calories, double ProteinG, double CarbsG, double FatsG);
}

public class WeeklyRecommendationResult
{
    public string WeekStart { get; set; } = string.Empty;
    public string TargetWeekStart { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public string Mode { get; set; } = "recommend-only";
    public WeeklyRecommendationFilters Filters { get; set; } = new();
    public WeeklySignals Signals { get; set; } = new();
    public WeeklySignalSummary Summary { get; set; } = new();
    public List<DailyNutritionRow> DailyNutrition { get; set; } = new();
    public List<RecommendationItem> Recommendations { get; set; } = new();
    public SuggestedPlans SuggestedPlans { get; set; } = new();
}

public class WeeklyRecommendationGenerateRequest
{
    public string? WeekStart { get; set; }
    public bool ForNextWeek { get; set; } = true;
    public WeeklyRecommendationFilters? Filters { get; set; }
}

public class WeeklyRecommendationFilters
{
    public List<int>? IncludeMealTemplateIds { get; set; }
    public List<int>? ExcludeMealTemplateIds { get; set; }
    public List<string>? IncludeMealNames { get; set; }
    public List<string>? ExcludeMealNames { get; set; }
    public List<int>? IncludeExerciseIds { get; set; }
    public List<int>? ExcludeExerciseIds { get; set; }
    public List<string>? IncludeMuscleGroups { get; set; }
    public List<string>? ExcludeMuscleGroups { get; set; }
}

public class SuggestedPlans
{
    public Dictionary<string, List<MealSuggestion>> MealPlan { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, List<WorkoutSuggestion>> WorkoutRoutine { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class MealSuggestion
{
    public int MealTemplateId { get; set; }
    public string? TimeOfDay { get; set; }
}

public class WorkoutSuggestion
{
    public int ExerciseId { get; set; }
    public int Sets { get; set; } = 3;
    public int Reps { get; set; } = 10;
}

public class WeeklySignals
{
    public double MealAdherence { get; set; }
    public double CalorieAdherence { get; set; }
    public MacroSignal MacroAdherence { get; set; } = new();
    public double WorkoutAdherence { get; set; }
    public StrengthSignal StrengthProgress { get; set; } = new();
    public WeightSignal WeightProgress { get; set; } = new();
}

public class MacroSignal
{
    public double Score { get; set; }
    public double ProteinRatio { get; set; }
    public double CarbsRatio { get; set; }
    public double FatsRatio { get; set; }
}

public class StrengthSignal
{
    public double Score { get; set; }
    public double VolumeChangeRatio { get; set; }
    public int PrCount { get; set; }
}

public class WeightSignal
{
    public double Score { get; set; }
    public double WeeklyChangeKg { get; set; }
    public string TargetDirection { get; set; } = "unknown";
    public double? CurrentAverageKg { get; set; }
    public double? PreviousAverageKg { get; set; }
    public double? TargetWeightKg { get; set; }
    public bool HasEnoughData { get; set; }
}

public class WeeklySignalSummary
{
    public int? DailyCaloriesTarget { get; set; }
    public int PlannedWeeklyCalories { get; set; }
    public int ActualWeeklyCalories { get; set; }
    public int PlannedWorkoutDays { get; set; }
    public int CompletedWorkoutDays { get; set; }
    public decimal WeeklyVolume { get; set; }
    public decimal PreviousWeeklyVolume { get; set; }
    public int PrCount { get; set; }
}

public class DailyNutritionRow
{
    public string Date { get; set; } = string.Empty;
    public int PlannedMealCount { get; set; }
    public int LoggedMealCount { get; set; }
    public int MatchedPlannedMealCount { get; set; }
    public int PlannedCalories { get; set; }
    public int ActualCalories { get; set; }
    public double PlannedProteinG { get; set; }
    public double ActualProteinG { get; set; }
    public double PlannedCarbsG { get; set; }
    public double ActualCarbsG { get; set; }
    public double PlannedFatsG { get; set; }
    public double ActualFatsG { get; set; }
}

public class RecommendationItem
{
    public string Domain { get; set; } = string.Empty;
    public string Priority { get; set; } = "low";
    public string Title { get; set; } = string.Empty;
    public string ProposedChange { get; set; } = string.Empty;
    public string Rationale { get; set; } = string.Empty;
    public double Confidence { get; set; }
}
