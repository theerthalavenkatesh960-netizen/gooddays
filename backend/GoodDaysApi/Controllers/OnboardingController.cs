using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Authorize]
[Route("api/onboarding")]
public class OnboardingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IOnboardingService _onboardingService;

    public OnboardingController(AppDbContext db, IOnboardingService onboardingService)
    {
        _db = db;
        _onboardingService = onboardingService;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userId = GetUserId();
        var row = await _db.UserOnboardings.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        if (row is null)
        {
            return Ok(new { completed = false, data = (object?)null });
        }

        return Ok(new
        {
            completed = row.CompletedAt.HasValue,
            data = new
            {
                selectedFeatures = row.SelectedFeatures,
                heightCm = row.HeightCm,
                currentWeightKg = row.CurrentWeightKg,
                targetWeightKg = row.TargetWeightKg,
                targetDate = row.TargetDate?.ToString("yyyy-MM-dd"),
                age = row.Age,
                gender = row.Gender,
                dailyCaloriesTarget = row.DailyCaloriesTarget,
                budgetPerWeek = row.BudgetPerWeek,
                activityLevel = row.ActivityLevel,
                dietPreference = row.DietPreference,
                preferredWorkouts = row.PreferredWorkouts,
                workoutsPerWeek = row.WorkoutsPerWeek,
                minutesPerSession = row.MinutesPerSession,
                preferredMeals = row.PreferredMeals,
                preferredIngredientIds = row.PreferredIngredientIds,
                excludedIngredientIds = row.ExcludedIngredientIds,
                generationMode = row.GenerationMode,
                planAdherenceScore = row.PlanAdherenceScore,
            }
        });
    }

    [HttpPost("complete")]
    public async Task<IActionResult> Complete([FromBody] CompleteOnboardingRequest req)
    {
        var userId = GetUserId();

        var selectedFeatures = (req.SelectedFeatures ?? Array.Empty<string>())
            .Select(x => (x ?? string.Empty).Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (selectedFeatures.Length == 0)
        {
            return BadRequest(new { message = "Select at least one feature." });
        }

        var preferredWorkouts = (req.PreferredWorkouts ?? Array.Empty<string>())
            .Select(x => (x ?? string.Empty).Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var preferredMeals = (req.PreferredMeals ?? Array.Empty<string>())
            .Select(x => (x ?? string.Empty).Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var preferredIngredientIds = (req.PreferredIngredientIds ?? Array.Empty<int>())
            .Where(x => x > 0)
            .Distinct()
            .ToList();

        // Allow users to add quick custom ingredients during onboarding.
        foreach (var name in (req.CustomPreferredIngredients ?? Array.Empty<string>()))
        {
            if (string.IsNullOrWhiteSpace(name)) continue;
            var trimmed = name.Trim();
            if (trimmed.Length == 0) continue;

            var existing = await _db.MealIngredients
                .FirstOrDefaultAsync(i => i.UserId == userId && i.Name.ToLower() == trimmed.ToLower());

            if (existing is null)
            {
                existing = new MealIngredient
                {
                    UserId = userId,
                    Name = trimmed,
                    CaloriesKcal = 0,
                    ProteinG = 0,
                    CarbsG = 0,
                    FatsG = 0,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.MealIngredients.Add(existing);
                await _db.SaveChangesAsync();
            }

            if (!preferredIngredientIds.Contains(existing.Id)) preferredIngredientIds.Add(existing.Id);
        }

        if (preferredIngredientIds.Count < 5)
        {
            return BadRequest(new { message = "Pick at least 5 preferred ingredients." });
        }

        var excludedIngredientIds = (req.ExcludedIngredientIds ?? Array.Empty<int>())
            .Where(x => x > 0)
            .Distinct()
            .Where(x => !preferredIngredientIds.Contains(x))
            .ToArray();

        var generationMode = string.Equals(req.GenerationMode, "normal", StringComparison.OrdinalIgnoreCase)
            ? "normal"
            : "ai";

        var row = await _db.UserOnboardings.FirstOrDefaultAsync(x => x.UserId == userId);
        if (row is null)
        {
            row = new UserOnboarding { UserId = userId, CreatedAt = DateTime.UtcNow };
            _db.UserOnboardings.Add(row);
        }

        row.SelectedFeatures = selectedFeatures;
        row.HeightCm = req.HeightCm;
        row.CurrentWeightKg = req.CurrentWeightKg;
        row.TargetWeightKg = req.TargetWeightKg;
        row.TargetDate = DateOnly.TryParse(req.TargetDate, out var td) ? td : (DateOnly?)null;
        row.Age = req.Age;
        row.Gender = string.IsNullOrWhiteSpace(req.Gender) ? null : req.Gender.Trim();
        row.DailyCaloriesTarget = req.DailyCaloriesTarget;
        row.BudgetPerWeek = req.BudgetPerWeek;
        row.ActivityLevel = string.IsNullOrWhiteSpace(req.ActivityLevel) ? null : req.ActivityLevel.Trim();
        row.DietPreference = string.IsNullOrWhiteSpace(req.DietPreference) ? null : req.DietPreference.Trim();
        row.PreferredWorkouts = preferredWorkouts;
        row.WorkoutsPerWeek = req.WorkoutsPerWeek;
        row.MinutesPerSession = req.MinutesPerSession;
        row.PreferredMeals = preferredMeals;
        row.PreferredIngredientIds = preferredIngredientIds.ToArray();
        row.ExcludedIngredientIds = excludedIngredientIds;
        row.GenerationMode = generationMode;
        row.PlanAdherenceScore = req.PlanAdherenceScore.HasValue
            ? Math.Clamp(req.PlanAdherenceScore.Value, 1, 5)
            : (int?)null;
        row.CompletedAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;

        // Keep health profile synced so existing AI endpoints can run in profile mode.
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null)
        {
            profile = new UserHealthProfile { UserId = userId };
            _db.UserHealthProfiles.Add(profile);
        }

        profile.Age = req.Age;
        profile.Gender = string.IsNullOrWhiteSpace(req.Gender) ? null : req.Gender.Trim();
        profile.HeightCm = req.HeightCm;
        profile.WeightKg = req.CurrentWeightKg;
        profile.TargetWeightKg = req.TargetWeightKg;
        profile.DailyCaloriesTarget = req.DailyCaloriesTarget;
        profile.DietPreference = string.IsNullOrWhiteSpace(req.DietPreference) ? null : req.DietPreference.Trim();
        profile.BudgetPerWeek = req.BudgetPerWeek;
        profile.ActivityLevel = string.IsNullOrWhiteSpace(req.ActivityLevel) ? null : req.ActivityLevel.Trim();
        profile.TargetDate = DateOnly.TryParse(req.TargetDate, out var profileDate) ? profileDate : (DateOnly?)null;
        profile.UpdatedAt = DateTime.UtcNow;

        // Keep Body Progress sources in sync so values show immediately after onboarding.
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is not null)
        {
            user.HeightCm = req.HeightCm;
            user.TargetWeightKg = req.TargetWeightKg;
            user.UpdatedAt = DateTime.UtcNow;
        }

        if (req.CurrentWeightKg.HasValue)
        {
            var hasAnyWeightLog = await _db.BodyWeightLogs.AnyAsync(l => l.UserId == userId);
            if (!hasAnyWeightLog)
            {
                _db.BodyWeightLogs.Add(new BodyWeightLog
                {
                    UserId = userId,
                    Date = DateOnly.FromDateTime(DateTime.UtcNow),
                    WeightKg = req.CurrentWeightKg.Value,
                    Note = "Seeded from onboarding",
                    LoggedAt = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync();

        // Ensure AI settings exist for first-time users before background AI generation starts.
        if (string.Equals(generationMode, "ai", StringComparison.OrdinalIgnoreCase))
        {
            var aiSettings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            if (aiSettings is null)
            {
                aiSettings = new UserAiSetting
                {
                    UserId = userId,
                    Provider = "local-llama",
                    LocalEndpoint = "http://localhost:11434",
                    LocalModel = "llama3.1:8b",
                    ClaudeModel = "claude-3-5-sonnet-latest",
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.UserAiSettings.Add(aiSettings);
                await _db.SaveChangesAsync();
            }
        }

        // Queue background plan generation based on adherence score and preferences.
        var adherenceParams = GetAdherenceAdjustedParams(
            req.PlanAdherenceScore,
            req.WorkoutsPerWeek,
            req.MinutesPerSession);

        var payload = new OnboardingGenerationPayload(
            DaysPerWeek: adherenceParams.DaysPerWeek,
            MaxMealsPerDay: adherenceParams.MaxMealsPerDay,
            MinutesPerSession: adherenceParams.MinutesPerSession,
            AdherenceScore: req.PlanAdherenceScore);

        _onboardingService.QueuePlanGeneration(userId, payload);

        return Ok(new
        {
            completed = true,
            generationQueued = true,
        });
    }

    private static (int DaysPerWeek, int MinutesPerSession, int MaxMealsPerDay) GetAdherenceAdjustedParams(
        int? score, int? fallbackDays, int? fallbackMinutes)
    {
        // Adherence scale: 1-10 (clamped)
        // 1-3: Beginner/Inconsistent
        // 4-5: Building/Trying
        // 6-7: Moderate/Disciplined
        // 8-10: Advanced/Athlete
        var clamped = Math.Max(1, Math.Min(10, score ?? 5));
        var baseParams = clamped <= 3
            ? (DaysPerWeek: 2, MinutesPerSession: 25, MaxMealsPerDay: 3)
            : clamped <= 5
                ? (DaysPerWeek: 3, MinutesPerSession: 35, MaxMealsPerDay: 3)
                : clamped <= 7
                    ? (DaysPerWeek: 4, MinutesPerSession: 45, MaxMealsPerDay: 3)
                    : (DaysPerWeek: 5, MinutesPerSession: 60, MaxMealsPerDay: 3);

        var daysPerWeek = fallbackDays.HasValue
            ? Math.Max(1, Math.Min(6, (int)Math.Round((fallbackDays.Value + baseParams.DaysPerWeek) / 2.0)))
            : baseParams.DaysPerWeek;

        var minutesPerSession = fallbackMinutes.HasValue
            ? Math.Max(20, Math.Min(90, (int)Math.Round((fallbackMinutes.Value + baseParams.MinutesPerSession) / 2.0)))
            : baseParams.MinutesPerSession;

        return (daysPerWeek, minutesPerSession, baseParams.MaxMealsPerDay);
    }
}

public record CompleteOnboardingRequest(
    string[]? SelectedFeatures,
    int? HeightCm,
    decimal? CurrentWeightKg,
    decimal? TargetWeightKg,
    string? TargetDate,
    int? Age,
    string? Gender,
    int? DailyCaloriesTarget,
    int? BudgetPerWeek,
    string? ActivityLevel,
    string? DietPreference,
    string[]? PreferredWorkouts,
    string[]? PreferredMeals,
    int? WorkoutsPerWeek,
    int? MinutesPerSession,
    int[]? PreferredIngredientIds,
    int[]? ExcludedIngredientIds,
    string[]? CustomPreferredIngredients,
    string? GenerationMode,
    int? PlanAdherenceScore);