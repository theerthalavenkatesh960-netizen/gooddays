using System.Text.Json;
using System.Text;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services;

public interface IOnboardingService
{
    /// <summary>
    /// Queue background plan generation for onboarding completion.
    /// Fires and forgets—does not wait for completion.
    /// </summary>
    void QueuePlanGeneration(int userId, OnboardingGenerationPayload payload);
}

public class OnboardingService : IOnboardingService
{
    private readonly AppDbContext _db;
    private readonly AiService _aiService;
    private readonly ILogger<OnboardingService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public OnboardingService(
        AppDbContext db,
        AiService aiService,
        ILogger<OnboardingService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _aiService = aiService;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public void QueuePlanGeneration(int userId, OnboardingGenerationPayload payload)
    {
        // Fire-and-forget: kick off a task without awaiting.
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var scopedAiService = scope.ServiceProvider.GetRequiredService<AiService>();

                // Use a scoped runner so DbContext/AI service remain valid for the background task lifetime.
                var runner = new OnboardingService(scopedDb, scopedAiService, _logger, _scopeFactory);
                await runner.GeneratePlansAsync(userId, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background onboarding plan generation failed for user {UserId}", userId);
                // Silently fail—do not throw. User has already navigated to dashboard.
            }
        });
    }

    private async Task GeneratePlansAsync(int userId, OnboardingGenerationPayload payload)
    {
        // Retrieve user's onboarding and health profile to get context for generation.
        var onboarding = await _db.UserOnboardings.FirstOrDefaultAsync(x => x.UserId == userId);
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(x => x.UserId == userId);

        if (onboarding is null)
        {
            _logger.LogWarning("Onboarding record not found for user {UserId}", userId);
            return;
        }

        // Generate meal plan.
        if (onboarding.SelectedFeatures?.Contains("health", StringComparer.OrdinalIgnoreCase) ?? false)
        {
            try
            {
                await GenerateMealPlanAsync(userId, onboarding, profile, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate meal plan for user {UserId}", userId);
            }
        }

        // Generate workout plan.
        if (onboarding.SelectedFeatures?.Contains("health", StringComparer.OrdinalIgnoreCase) ?? false)
        {
            try
            {
                await GenerateWorkoutPlanAsync(userId, onboarding, profile, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate workout plan for user {UserId}", userId);
            }
        }
    }

    private async Task GenerateMealPlanAsync(int userId, UserOnboarding onboarding, UserHealthProfile? profile, OnboardingGenerationPayload payload)
    {
        var templates = await _db.MealTemplates
            .Where(t => t.UserId == userId)
            .ToListAsync();

        if (templates.Count == 0)
        {
            _logger.LogWarning("No meal templates available for user {UserId}", userId);
            return;
        }

        var mealPlan = new Dictionary<string, List<object>>();

        if (string.Equals(onboarding.GenerationMode, "ai", StringComparison.OrdinalIgnoreCase))
        {
            mealPlan = await TryBuildAiMealPlanAsync(userId, profile, payload, templates);
            if (mealPlan.Count == 0)
            {
                _logger.LogWarning("AI meal plan generation returned empty result for user {UserId}; falling back to normal generation", userId);
                mealPlan = BuildNormalMealPlan(templates, onboarding.PreferredIngredientIds, onboarding.ExcludedIngredientIds, payload.MaxMealsPerDay);
            }
        }
        else
        {
            // Normal generation: rank templates by preferred/excluded ingredients.
            mealPlan = BuildNormalMealPlan(templates, onboarding.PreferredIngredientIds, onboarding.ExcludedIngredientIds, payload.MaxMealsPerDay);
        }

        // Persist the meal plan for next 7 days.
        if (mealPlan.Count > 0)
        {
            await PersistMealPlanAsync(userId, mealPlan);
        }
    }

    private async Task GenerateWorkoutPlanAsync(int userId, UserOnboarding onboarding, UserHealthProfile? profile, OnboardingGenerationPayload payload)
    {
        var exercises = await _db.Exercises
            .Where(e => (e.UserId == userId) || !e.IsCustom)
            .ToListAsync();

        if (exercises.Count == 0)
        {
            _logger.LogWarning("No exercises available for user {UserId}", userId);
            return;
        }

        Dictionary<string, List<object>> workoutRoutine;

        if (string.Equals(onboarding.GenerationMode, "ai", StringComparison.OrdinalIgnoreCase))
        {
            workoutRoutine = await TryBuildAiWorkoutRoutineAsync(userId, profile, payload, exercises);
            if (workoutRoutine.Count == 0)
            {
                _logger.LogWarning("AI workout generation returned empty result for user {UserId}; falling back to normal generation", userId);
                workoutRoutine = BuildNormalWorkoutRoutine(exercises, payload.DaysPerWeek);
            }
        }
        else
        {
            workoutRoutine = BuildNormalWorkoutRoutine(exercises, payload.DaysPerWeek);
        }

        // Persist the routine for next 7 days.
        if (workoutRoutine.Values.Any(v => v.Count > 0))
        {
            await PersistWorkoutRoutineAsync(userId, workoutRoutine);
        }
    }

    private async Task<Dictionary<string, List<object>>> TryBuildAiMealPlanAsync(
        int userId,
        UserHealthProfile? profile,
        OnboardingGenerationPayload payload,
        List<MealTemplate> templates)
    {
        try
        {
            var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            var startDate = DateOnly.FromDateTime(DateTime.UtcNow);
            var prompt = BuildAiMealPrompt(startDate, payload, profile, templates);
            var rawText = await _aiService.InvokeProvider(settings, prompt, "onboarding-meal-plan");
            var parsed = ParseAiMealPlan(ParseJsonObject(rawText));

            var validIds = templates.Select(t => t.Id).ToHashSet();
            var sanitized = new Dictionary<string, List<object>>();
            foreach (var kv in parsed)
            {
                var key = NormalizeDateKey(kv.Key);
                if (string.IsNullOrWhiteSpace(key)) continue;

                var items = kv.Value
                    .Where(m => validIds.Contains(m.MealTemplateId))
                    .Take(Math.Max(1, payload.MaxMealsPerDay))
                    .Select(m => (object)new { mealTemplateId = m.MealTemplateId, timeOfDay = m.TimeOfDay })
                    .ToList();

                if (items.Count > 0) sanitized[key] = items;
            }

            return sanitized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI meal plan generation failed for user {UserId}", userId);
            return new Dictionary<string, List<object>>();
        }
    }

    private async Task<Dictionary<string, List<object>>> TryBuildAiWorkoutRoutineAsync(
        int userId,
        UserHealthProfile? profile,
        OnboardingGenerationPayload payload,
        List<Exercise> exercises)
    {
        try
        {
            var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            var prompt = BuildAiWorkoutPrompt(payload, profile, exercises);
            var rawText = await _aiService.InvokeProvider(settings, prompt, "onboarding-workout-routine");
            var parsed = ParseAiWorkoutRoutine(ParseJsonObject(rawText));

            var validIds = exercises.Select(e => e.Id).ToHashSet();
            var allowedDays = new HashSet<string>(new[] { "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" });
            var sanitized = new Dictionary<string, List<object>>();

            foreach (var kv in parsed)
            {
                var day = (kv.Key ?? string.Empty).Trim().ToLowerInvariant();
                if (!allowedDays.Contains(day)) continue;

                var items = kv.Value
                    .Where(v => validIds.Contains(v.ExerciseId))
                    .Select(v => (object)new
                    {
                        exerciseId = v.ExerciseId,
                        sets = Math.Max(1, v.Sets <= 0 ? 3 : v.Sets),
                        reps = Math.Max(1, v.Reps <= 0 ? 10 : v.Reps),
                    })
                    .ToList();

                if (items.Count > 0) sanitized[day] = items;
            }

            return sanitized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI workout generation failed for user {UserId}", userId);
            return new Dictionary<string, List<object>>();
        }
    }

    private Dictionary<string, List<object>> BuildNormalMealPlan(
        List<MealTemplate> templates,
        int[]? preferredIds,
        int[]? excludedIds,
        int maxMealsPerDay)
    {
        var preferred = new HashSet<int>(preferredIds ?? Array.Empty<int>());
        var excluded = new HashSet<int>(excludedIds ?? Array.Empty<int>());

        var ranked = templates
            .Select(t => new
            {
                Template = t,
                HasExcluded = ParseTemplateIngredientIds(t.IngredientsJson).Any(id => excluded.Contains(id)),
                Score = ParseTemplateIngredientIds(t.IngredientsJson).Count(id => preferred.Contains(id)),
            })
            .OrderBy(x => x.HasExcluded)
            .ThenByDescending(x => x.Score)
            .Select(x => x.Template)
            .ToList();

        var picks = ranked.Take(Math.Max(1, maxMealsPerDay)).ToList();

        var result = new Dictionary<string, List<object>>();
        for (int i = 0; i < 7; i++)
        {
            var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(i));
            var key = date.ToString("yyyy-MM-dd");
            result[key] = picks
                .Select(t => (object)new { mealTemplateId = t.Id, timeOfDay = t.TimeOfDay ?? (string?)null })
                .ToList();
        }

        return result;
    }

    private int[] ParseTemplateIngredientIds(string? ingredientsJson)
    {
        if (string.IsNullOrWhiteSpace(ingredientsJson))
            return Array.Empty<int>();

        try
        {
            using var doc = JsonDocument.Parse(ingredientsJson);
            return doc.RootElement.EnumerateArray()
                .Select(elem =>
                {
                    if (elem.TryGetProperty("id", out var idProp) && idProp.TryGetInt32(out var id))
                        return id;
                    return 0;
                })
                .Where(id => id > 0)
                .Distinct()
                .ToArray();
        }
        catch
        {
            return Array.Empty<int>();
        }
    }

    private static string BuildAiMealPrompt(
        DateOnly start,
        OnboardingGenerationPayload payload,
        UserHealthProfile? profile,
        List<MealTemplate> templates)
    {
        var templateRows = templates.Select(t => $"- id={t.Id}, name={t.Name}, timing={t.Timing}, timeOfDay={t.TimeOfDay ?? ""}");
        var sb = new StringBuilder();
        sb.AppendLine("Return STRICT JSON only.");
        sb.AppendLine($"Plan meals for 7 days from {start:yyyy-MM-dd}.");
        sb.AppendLine($"Use up to {Math.Max(1, payload.MaxMealsPerDay)} meals per day.");
        sb.AppendLine("Use ONLY these mealTemplateIds:");
        sb.AppendLine(string.Join("\n", templateRows));
        sb.AppendLine();
        sb.AppendLine($"profileHeightCm={profile?.HeightCm?.ToString() ?? "null"}, profileWeightKg={profile?.WeightKg?.ToString() ?? "null"}, profileTargetWeightKg={profile?.TargetWeightKg?.ToString() ?? "null"}, profileCalories={profile?.DailyCaloriesTarget?.ToString() ?? "null"}, profileDiet={profile?.DietPreference ?? "null"}, profileBudget={profile?.BudgetPerWeek?.ToString() ?? "null"}, profileActivity={profile?.ActivityLevel ?? "null"}");
        sb.AppendLine();
        sb.AppendLine("Output schema:");
        sb.AppendLine("{");
        sb.AppendLine("  \"plan\": {");
        sb.AppendLine("    \"YYYY-MM-DD\": [");
        sb.AppendLine("      { \"mealTemplateId\": 1, \"timeOfDay\": \"08:00\" },");
        sb.AppendLine("      { \"mealTemplateId\": 2, \"timeOfDay\": \"13:00\" }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        return sb.ToString();
    }

    private static string BuildAiWorkoutPrompt(
        OnboardingGenerationPayload payload,
        UserHealthProfile? profile,
        List<Exercise> exercises)
    {
        var exerciseRows = exercises.Select(e => $"- id={e.Id}, name={e.Name}, muscleGroup={e.MuscleGroup}");
        var sb = new StringBuilder();
        sb.AppendLine("Return STRICT JSON only.");
        sb.AppendLine("Build weekly routine for monday..sunday.");
        sb.AppendLine("Use ONLY these exerciseIds:");
        sb.AppendLine(string.Join("\n", exerciseRows));
        sb.AppendLine();
        sb.AppendLine($"daysPerWeek={payload.DaysPerWeek}, minutesPerSession={payload.MinutesPerSession}, setsDefault=3, repsDefault=10");
        sb.AppendLine($"profileHeightCm={profile?.HeightCm?.ToString() ?? "null"}, profileWeightKg={profile?.WeightKg?.ToString() ?? "null"}, profileTargetWeightKg={profile?.TargetWeightKg?.ToString() ?? "null"}, profileCalories={profile?.DailyCaloriesTarget?.ToString() ?? "null"}, profileActivity={profile?.ActivityLevel ?? "null"}");
        sb.AppendLine();
        sb.AppendLine("Output schema:");
        sb.AppendLine("{");
        sb.AppendLine("  \"routine\": {");
        sb.AppendLine("    \"monday\": [{ \"exerciseId\": 1, \"sets\": 3, \"reps\": 10 }],");
        sb.AppendLine("    \"tuesday\": [{ \"exerciseId\": 2, \"sets\": 3, \"reps\": 10 }],");
        sb.AppendLine("    \"wednesday\": [],");
        sb.AppendLine("    \"thursday\": [],");
        sb.AppendLine("    \"friday\": [],");
        sb.AppendLine("    \"saturday\": [],");
        sb.AppendLine("    \"sunday\": []");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        return sb.ToString();
    }

    private static JsonElement ParseJsonObject(string text)
    {
        var trimmed = (text ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("AI returned empty response.");

        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstBrace = trimmed.IndexOf('{');
            var lastBrace = trimmed.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                trimmed = trimmed.Substring(firstBrace, lastBrace - firstBrace + 1);
            }
        }

        var start = trimmed.IndexOf('{');
        var end = trimmed.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            trimmed = trimmed.Substring(start, end - start + 1);
        }

        using var doc = JsonDocument.Parse(trimmed);
        return doc.RootElement.Clone();
    }

    private static Dictionary<string, List<AiMealPlanItem>> ParseAiMealPlan(JsonElement root)
    {
        if (!root.TryGetProperty("plan", out var planNode) || planNode.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("Missing 'plan' object.");

        var map = new Dictionary<string, List<AiMealPlanItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var day in planNode.EnumerateObject())
        {
            if (day.Value.ValueKind != JsonValueKind.Array) continue;
            var list = new List<AiMealPlanItem>();
            foreach (var item in day.Value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                if (!item.TryGetProperty("mealTemplateId", out var idNode) || !idNode.TryGetInt32(out var id)) continue;
                var time = item.TryGetProperty("timeOfDay", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
                list.Add(new AiMealPlanItem(id, time));
            }
            map[day.Name] = list;
        }

        return map;
    }

    private static Dictionary<string, List<AiWorkoutPlanItem>> ParseAiWorkoutRoutine(JsonElement root)
    {
        if (!root.TryGetProperty("routine", out var routineNode) || routineNode.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("Missing 'routine' object.");

        var map = new Dictionary<string, List<AiWorkoutPlanItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var day in routineNode.EnumerateObject())
        {
            if (day.Value.ValueKind != JsonValueKind.Array) continue;
            var list = new List<AiWorkoutPlanItem>();
            foreach (var item in day.Value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                if (!item.TryGetProperty("exerciseId", out var idNode) || !idNode.TryGetInt32(out var id)) continue;
                var sets = item.TryGetProperty("sets", out var s) && s.TryGetInt32(out var sv) ? sv : 3;
                var reps = item.TryGetProperty("reps", out var r) && r.TryGetInt32(out var rv) ? rv : 10;
                list.Add(new AiWorkoutPlanItem(id, sets, reps));
            }
            map[day.Name] = list;
        }

        return map;
    }

    private static string NormalizeDateKey(string key)
    {
        return DateOnly.TryParse(key, out var d) ? d.ToString("yyyy-MM-dd") : string.Empty;
    }

    private Dictionary<string, List<object>> BuildNormalWorkoutRoutine(List<Exercise> exercises, int daysPerWeek)
    {
        var safeDays = Math.Max(1, Math.Min(6, daysPerWeek));
        var workoutDays = new[] { "monday", "tuesday", "thursday", "friday", "saturday", "wednesday" }
            .Take(safeDays)
            .ToList();

        var pool = exercises
            .Select(e => e.Id)
            .Take(24)
            .ToList();

        var routine = new Dictionary<string, List<object>>
        {
            { "sunday", new() },
            { "monday", new() },
            { "tuesday", new() },
            { "wednesday", new() },
            { "thursday", new() },
            { "friday", new() },
            { "saturday", new() },
        };

        if (pool.Count == 0)
            return routine;

        var cursor = 0;
        foreach (var day in workoutDays)
        {
            var block = Enumerable.Range(0, Math.Min(5, pool.Count))
                .Select(_ =>
                {
                    var id = pool[cursor % pool.Count];
                    cursor++;
                    return (object)new { exerciseId = id, sets = 3, reps = 10 };
                })
                .ToList();
            routine[day] = block;
        }

        return routine;
    }

    private async Task PersistMealPlanAsync(int userId, Dictionary<string, List<object>> mealPlan)
    {
        // Serialize and save weekly meal plan.
        var json = System.Text.Json.JsonSerializer.Serialize(mealPlan);

        // Check if any existing plan from current week
        // For simplicity, update or create a single meal plan per user
        var existing = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);

        if (existing is null)
        {
            existing = new WeeklyMealPlan
            {
                UserId = userId,
                PlanJson = json,
            };
            _db.WeeklyMealPlans.Add(existing);
        }
        else
        {
            existing.PlanJson = json;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private async Task PersistWorkoutRoutineAsync(int userId, Dictionary<string, List<object>> routine)
    {
        // Persist workout plans for each day of the week.
        var weekDays = new[] { "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" };
        var today = DateTime.UtcNow;

        for (int i = 0; i < 7; i++)
        {
            var date = today.AddDays(i);
            var dayName = weekDays[date.DayOfWeek == DayOfWeek.Sunday ? 0 : (int)date.DayOfWeek];

            var entries = routine.ContainsKey(dayName) ? routine[dayName] : new List<object>();
            if (entries.Count == 0)
                continue;

            var json = JsonSerializer.Serialize(entries);

            var existing = await _db.WorkoutDayPlans
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Date.Date == date.Date);

            if (existing is null)
            {
                existing = new WorkoutDayPlan
                {
                    UserId = userId,
                    Date = date,
                    DayLabel = dayName,
                    PlannedExercises = json,
                    IsCompleted = false,
                };
                _db.WorkoutDayPlans.Add(existing);
            }
            else
            {
                existing.PlannedExercises = json;
            }
        }

        await _db.SaveChangesAsync();
    }

    private record AiMealPlanItem(int MealTemplateId, string? TimeOfDay);
    private record AiWorkoutPlanItem(int ExerciseId, int Sets, int Reps);
}

public record OnboardingGenerationPayload(
    int DaysPerWeek,
    int MaxMealsPerDay,
    int MinutesPerSession);
