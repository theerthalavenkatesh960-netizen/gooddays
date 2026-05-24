using GoodDaysApi.Data;
using GoodDaysApi.Models;
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

    public OnboardingController(AppDbContext db)
    {
        _db = db;
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
            ? Math.Clamp(req.PlanAdherenceScore.Value, 1, 10)
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

        await _db.SaveChangesAsync();

        return Ok(new { completed = true });
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