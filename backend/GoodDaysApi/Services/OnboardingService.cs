using System.Text.Json;
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

    public OnboardingService(AppDbContext db, AiService aiService, ILogger<OnboardingService> logger)
    {
        _db = db;
        _aiService = aiService;
        _logger = logger;
    }

    public void QueuePlanGeneration(int userId, OnboardingGenerationPayload payload)
    {
        // Fire-and-forget: kick off a task without awaiting.
        _ = Task.Run(async () =>
        {
            try
            {
                await GeneratePlansAsync(userId, payload);
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
            // AI generation: call AiService or invoke AI endpoint.
            // For now, fall back to normal generation as a safe default.
            mealPlan = BuildNormalMealPlan(templates, onboarding.PreferredIngredientIds, onboarding.ExcludedIngredientIds, payload.MaxMealsPerDay);
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

        var workoutRoutine = BuildNormalWorkoutRoutine(exercises, payload.DaysPerWeek);

        // Persist the routine for next 7 days.
        if (workoutRoutine.Values.Any(v => v.Count > 0))
        {
            await PersistWorkoutRoutineAsync(userId, workoutRoutine);
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
}

public record OnboardingGenerationPayload(
    int DaysPerWeek,
    int MaxMealsPerDay,
    int MinutesPerSession);
