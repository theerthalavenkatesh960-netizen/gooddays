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
        var userTemplates = await _db.MealTemplates
            .Where(t => t.UserId == userId)
            .Include(t => t.MasterMealTemplate)
            .ToListAsync();

        // Pull master catalog to supplement user templates (e.g. new user with empty library).
        var masterTemplates = await _db.MasterMealTemplates.ToListAsync();

        // If user has no templates at all and master catalog is empty, bail out.
        if (userTemplates.Count == 0 && masterTemplates.Count == 0)
        {
            _logger.LogWarning("No meal templates available for user {UserId}", userId);
            return;
        }

        // Ensure every master template that will be used in the plan exists as a user
        // meal_template (linked via master_meal_template_id). Clone missing ones lazily.
        var existingMasterLinks = userTemplates
            .Where(t => t.MasterMealTemplateId.HasValue)
            .ToDictionary(t => t.MasterMealTemplateId!.Value, t => t);

        foreach (var master in masterTemplates)
        {
            if (!existingMasterLinks.ContainsKey(master.Id))
            {
                var cloned = new MealTemplate
                {
                    UserId = userId,
                    Name = master.Name,
                    Timing = master.Timing,
                    TimeOfDay = master.TimeOfDay,
                    IngredientsJson = master.IngredientsJson,
                    Recipe = master.Recipe,
                    ImageUrl = master.ImageUrl,
                    MasterMealTemplateId = master.Id,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.MealTemplates.Add(cloned);
                userTemplates.Add(cloned); // will get Id after SaveChanges
            }
        }

        if (_db.ChangeTracker.HasChanges())
            await _db.SaveChangesAsync(); // assign IDs to cloned templates

        // Calculate meal slots based on goal, adherence, and activity level.
        var mealTimings = CalculateMealTimings(profile, payload.AdherenceScore);

        var mealPlan = new Dictionary<string, List<object>>();

        if (string.Equals(onboarding.GenerationMode, "ai", StringComparison.OrdinalIgnoreCase))
        {
            mealPlan = await TryBuildAiMealPlanAsync(userId, profile, payload, userTemplates, mealTimings);
            if (mealPlan.Count == 0)
            {
                _logger.LogWarning("AI meal plan generation returned empty result for user {UserId}; falling back to normal generation", userId);
                mealPlan = BuildNormalMealPlan(userTemplates, masterTemplates, onboarding.PreferredIngredientIds, onboarding.ExcludedIngredientIds, mealTimings, (double?)profile?.BudgetPerWeek);
            }
        }
        else
        {
            mealPlan = BuildNormalMealPlan(userTemplates, masterTemplates, onboarding.PreferredIngredientIds, onboarding.ExcludedIngredientIds, mealTimings, (double?)profile?.BudgetPerWeek);
        }

        // Persist the meal plan for next 7 days.
        if (mealPlan.Count > 0)
        {
            await PersistMealPlanAsync(userId, mealPlan);
        }
    }

    /// <summary>
    /// Calculate required meal timings based on user's goal, adherence level, and activity level.
    /// 
    /// Rules:
    /// - Adherence 1-3 (Beginner): 3 core meals only (breakfast, lunch, dinner)
    /// - Adherence 4-5 (Building) + (Bulk OR Maintain): 3 core + snack
    /// - Adherence 6-7 (Moderate) + Bulk: 3 core + snack + pre-workout
    /// - Adherence 8-10 (Advanced) + Bulk + Very Active: 3 core + snack + pre-workout + post-workout
    /// - Adherence 8-10 + Cut + Very Active: 3 core + pre-workout (4 total, no post-workout when cutting)
    /// - All other combinations: 3 core meals
    /// </summary>
    private static List<string> CalculateMealTimings(UserHealthProfile? profile, int? adherenceScore)
    {
        var timings = new List<string> { "breakfast", "lunch", "dinner" };

        if (profile == null)
            return timings;

        var clamped = Math.Max(1, Math.Min(10, adherenceScore ?? 5));
        var currentWeight = profile.WeightKg ?? 0;
        var targetWeight = profile.TargetWeightKg ?? currentWeight;
        var isVeryActive = profile.ActivityLevel?.Equals("very_active", StringComparison.OrdinalIgnoreCase) ?? false;

        // Determine goal: bulk (target > current), cut (target < current), maintain (equal).
        string goal = currentWeight < targetWeight ? "bulk" : currentWeight > targetWeight ? "cut" : "maintain";

        // Adherence 1-3: only core meals.
        if (clamped <= 3)
            return timings;

        // Adherence 4-5: add snack if bulk or maintain.
        if (clamped <= 5 && (goal == "bulk" || goal == "maintain"))
        {
            timings.Add("snack");
            return timings;
        }

        // Adherence 6-7: add snack + pre-workout if bulk.
        if (clamped <= 7 && goal == "bulk")
        {
            timings.Add("snack");
            timings.Add("pre-workout");
            return timings;
        }

        // Adherence 8-10: advanced customization.
        if (clamped >= 8)
        {
            if (goal == "bulk" && isVeryActive)
            {
                // Bulk + very active: full extras.
                timings.Add("snack");
                timings.Add("pre-workout");
                timings.Add("post-workout");
            }
            else if (goal == "bulk")
            {
                // Bulk but not very active: snack + pre-workout.
                timings.Add("snack");
                timings.Add("pre-workout");
            }
            else if (goal == "cut" && isVeryActive)
            {
                // Cut + very active: add pre-workout for energy, but no post-workout (keep calories down).
                timings.Add("pre-workout");
            }
            else if (goal == "maintain" && isVeryActive)
            {
                // Maintain + very active: add snack + pre-workout.
                timings.Add("snack");
                timings.Add("pre-workout");
            }
            else if (goal == "maintain")
            {
                // Maintain but not very active: add snack.
                timings.Add("snack");
            }
        }

        return timings;
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
        List<MealTemplate> templates,
        List<string> mealTimings)
    {
        try
        {
            var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            var startDate = DateOnly.FromDateTime(DateTime.UtcNow);
            var prompt = BuildAiMealPrompt(startDate, payload, profile, templates, mealTimings);
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
        List<MasterMealTemplate> masterTemplates,
        int[]? preferredIds,
        int[]? excludedIds,
        List<string> mealTimings,
        double? budgetPerWeek)
    {
        var preferred = new HashSet<int>(preferredIds ?? Array.Empty<int>());
        var excluded = new HashSet<int>(excludedIds ?? Array.Empty<int>());

        // Build a lookup of master template macros/cost by masterMealTemplateId for bonus scoring.
        var masterById = masterTemplates.ToDictionary(m => m.Id);
        double? dailyBudget = budgetPerWeek.HasValue ? budgetPerWeek.Value / 7.0 : null;

        // Group templates by timing for easier selection.
        var templatesByTiming = templates
            .GroupBy(t => t.Timing ?? "unknown")
            .ToDictionary(g => g.Key, g => g.ToList());

        // Score all templates once.
        var scoredTemplates = templates
            .Select(t =>
            {
                var ingredientIds = ParseTemplateIngredientIds(t.IngredientsJson);
                bool hasExcluded = ingredientIds.Any(id => excluded.Contains(id));
                int preferredScore = ingredientIds.Count(id => preferred.Contains(id));

                // Cost fit: prefer templates whose estimated cost fits within daily budget.
                double costScore = 0;
                if (t.MasterMealTemplateId.HasValue && masterById.TryGetValue(t.MasterMealTemplateId.Value, out var master))
                {
                    double perMealBudget = dailyBudget.HasValue ? dailyBudget.Value / Math.Max(1, mealTimings.Count) : double.MaxValue;
                    costScore = master.EstimatedTotalCost <= perMealBudget ? 1.0 : 0.0;
                }

                return new { Template = t, HasExcluded = hasExcluded, Score = preferredScore + costScore };
            })
            .ToList();

        // Pick best meal for each required timing, guaranteeing diversity.
        var picks = new List<MealTemplate>();
        var usedIds = new HashSet<int>();

        foreach (var timing in mealTimings)
        {
            // Find templates matching this timing.
            var candidatesForTiming = scoredTemplates
                .Where(x => x.Template.Timing == timing && !usedIds.Contains(x.Template.Id))
                .OrderBy(x => x.HasExcluded)
                .ThenByDescending(x => x.Score)
                .FirstOrDefault();

            if (candidatesForTiming != null)
            {
                picks.Add(candidatesForTiming.Template);
                usedIds.Add(candidatesForTiming.Template.Id);
            }
            else
            {
                // Fallback: if no template for this timing, pick any unused template.
                var fallback = scoredTemplates
                    .Where(x => !usedIds.Contains(x.Template.Id))
                    .OrderBy(x => x.HasExcluded)
                    .ThenByDescending(x => x.Score)
                    .FirstOrDefault();

                if (fallback != null)
                {
                    picks.Add(fallback.Template);
                    usedIds.Add(fallback.Template.Id);
                }
            }
        }

        // If no picks found (shouldn't happen), take top 3 by score.
        if (picks.Count == 0)
        {
            picks = scoredTemplates
                .OrderBy(x => x.HasExcluded)
                .ThenByDescending(x => x.Score)
                .Take(3)
                .Select(x => x.Template)
                .ToList();
        }

        // Build plan for next 7 days.
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
        List<MealTemplate> templates,
        List<string> mealTimings)
    {
        // Determine goal for prompt context.
        var currentWeight = profile?.WeightKg ?? 0;
        var targetWeight = profile?.TargetWeightKg ?? currentWeight;
        string goal = currentWeight < targetWeight ? "bulk" : currentWeight > targetWeight ? "cut" : "maintain";
        string goalDescription = goal switch
        {
            "bulk" => "build muscle, increase calories",
            "cut" => "lose fat, reduce calories",
            _ => "maintain weight, steady calories"
        };

        var templateRows = templates.Select(t =>
        {
            var macroInfo = t.MasterMealTemplate is not null
                ? $", kcal={t.MasterMealTemplate.TotalCaloriesKcal}, protein={t.MasterMealTemplate.TotalProteinG:F1}g, carbs={t.MasterMealTemplate.TotalCarbsG:F1}g, fats={t.MasterMealTemplate.TotalFatsG:F1}g, estimatedCost={t.MasterMealTemplate.EstimatedTotalCost:F2}{(string.IsNullOrWhiteSpace(t.MasterMealTemplate.PlannerNotes) ? "" : $", notes={t.MasterMealTemplate.PlannerNotes}")}"
                : string.Empty;
            return $"- id={t.Id}, name={t.Name}, timing={t.Timing}, timeOfDay={t.TimeOfDay ?? ""}{macroInfo}";
        });
        var sb = new StringBuilder();
        sb.AppendLine("Return STRICT JSON only.");
        sb.AppendLine($"Plan meals for 7 days from {start:yyyy-MM-dd}.");
        sb.AppendLine();
        sb.AppendLine("CRITICAL MEAL TIMING RULES:");
        sb.AppendLine($"Required meal timings per day: {string.Join(", ", mealTimings)}");
        sb.AppendLine($"Goal: {goal} ({goalDescription})");
        sb.AppendLine($"Adherence level: {payload.AdherenceScore}/10");
        sb.AppendLine();
        sb.AppendLine("MEAL SELECTION RULES:");
        sb.AppendLine("1. ALWAYS include exactly ONE meal for each timing in the required list above.");
        sb.AppendLine("2. Never pick the same meal twice in one day (use different templates for each timing).");
        sb.AppendLine("3. Breakfast, lunch, dinner are the core meals - prioritize variety for these.");
        sb.AppendLine("4. If snack/pre-workout/post-workout timings are in the list, fit them in strategically.");
        sb.AppendLine("5. For bulk goal: prefer higher-calorie, protein-rich meals to support muscle gain.");
        sb.AppendLine("6. For cut goal: prefer lower-calorie options while maintaining protein for satiety.");
        sb.AppendLine("7. Respect the weekly budget constraint when selecting meals.");
        sb.AppendLine();
        sb.AppendLine("Use ONLY these mealTemplateIds (each row includes macros and estimated cost where available):");
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
    int MinutesPerSession,
    int? AdherenceScore);
