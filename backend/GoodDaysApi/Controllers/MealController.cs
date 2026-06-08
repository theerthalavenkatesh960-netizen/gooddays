using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Meal;
using GoodDaysApi.Models;
using GoodDaysApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MealController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MealMacroCalculatorService _macroCalculator;

    public MealController(AppDbContext db, MealMacroCalculatorService macroCalculator)
    {
        _db = db;
        _macroCalculator = macroCalculator;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Ingredients ─────────────────────────────────────────────────────

    [HttpGet("ingredients")]
    public async Task<IActionResult> GetIngredients()
    {
        return Ok(await _db.MealIngredients.OrderBy(i => i.Name).ToListAsync());
    }

    [HttpPost("ingredients")]
    public async Task<IActionResult> CreateIngredient([FromBody] MealIngredientUpsertRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Ingredient name is required.");

        var entity = new MealIngredient
        {
            Name = body.Name.Trim(),
            CaloriesKcal = Math.Max(0, body.CaloriesKcal),
            ProteinG = Math.Max(0, body.ProteinG),
            CarbsG = Math.Max(0, body.CarbsG),
            FatsG = Math.Max(0, body.FatsG),
            DefaultQty = Math.Max(0.01, body.DefaultQty), // Ensure at least 0.01
            DefaultUnit = string.IsNullOrWhiteSpace(body.DefaultUnit) ? "unit" : body.DefaultUnit.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.MealIngredients.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("ingredients/{id}")]
    public async Task<IActionResult> UpdateIngredient(int id, [FromBody] MealIngredientUpsertRequest body)
    {
        var item = await _db.MealIngredients.FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Ingredient name is required.");

        item.Name = body.Name.Trim();
        item.CaloriesKcal = Math.Max(0, body.CaloriesKcal);
        item.ProteinG = Math.Max(0, body.ProteinG);
        item.CarbsG = Math.Max(0, body.CarbsG);
        item.FatsG = Math.Max(0, body.FatsG);
        item.DefaultQty = Math.Max(0.01, body.DefaultQty);
        item.DefaultUnit = string.IsNullOrWhiteSpace(body.DefaultUnit) ? "unit" : body.DefaultUnit.Trim();

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("ingredients/{id}")]
    public async Task<IActionResult> DeleteIngredient(int id)
    {
        var item = await _db.MealIngredients.FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();
        _db.MealIngredients.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Meal Templates ───────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
    {
        var userId = GetUserId();
        var templates = await _db.MealTemplates
            .Where(m => m.UserId == userId)
            .Include(m => m.MasterMealTemplate)
            .OrderBy(m => m.Name)
            .ToListAsync();

        var withMacros = await _macroCalculator.ConvertManyToWithMacrosAsync(templates);
        return Ok(withMacros);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] MealTemplateUpsertRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Template name is required.");
        var userId = GetUserId();
        var ingredientsJson = string.IsNullOrWhiteSpace(body.IngredientsJson) ? "[]" : body.IngredientsJson;

        await EnsureMissingIngredientsFromJsonAsync(ingredientsJson);

        var entity = new MealTemplate
        {
            UserId = userId,
            Name = body.Name.Trim(),
            Timing = string.IsNullOrWhiteSpace(body.Timing) ? "breakfast" : body.Timing.Trim(),
            TimeOfDay = string.IsNullOrWhiteSpace(body.TimeOfDay) ? null : body.TimeOfDay.Trim(),
            IngredientsJson = ingredientsJson,
            Recipe = body.Recipe?.Trim() ?? string.Empty,
            ImageUrl = string.IsNullOrWhiteSpace(body.ImageUrl) ? null : body.ImageUrl.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.MealTemplates.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("templates/{id}")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] MealTemplateUpsertRequest body)
    {
        var userId = GetUserId();
        var item = await _db.MealTemplates.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
        if (item is null) return NotFound();
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Template name is required.");

        var ingredientsJson = string.IsNullOrWhiteSpace(body.IngredientsJson) ? "[]" : body.IngredientsJson;
        await EnsureMissingIngredientsFromJsonAsync(ingredientsJson);

        item.Name = body.Name.Trim();
        item.Timing = string.IsNullOrWhiteSpace(body.Timing) ? "breakfast" : body.Timing.Trim();
        item.TimeOfDay = string.IsNullOrWhiteSpace(body.TimeOfDay) ? null : body.TimeOfDay.Trim();
        item.IngredientsJson = ingredientsJson;
        item.Recipe = body.Recipe?.Trim() ?? string.Empty;
        item.ImageUrl = string.IsNullOrWhiteSpace(body.ImageUrl) ? null : body.ImageUrl.Trim();

        // Detach from master catalog — the user has customised this meal so it is
        // no longer identical to the master entry. Clearing the link prevents the
        // AI prompt from showing stale master macros/notes for a modified meal.
        item.MasterMealTemplateId = null;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("templates/{id}")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var userId = GetUserId();
        var item = await _db.MealTemplates.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
        if (item is null) return NotFound();
        _db.MealTemplates.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Master Catalog Browse ────────────────────────────────────────────

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog(
        [FromQuery] string? search,
        [FromQuery] string? timing,
        [FromQuery] double? minCost,
        [FromQuery] double? maxCost,
        [FromQuery] int? minCalories,
        [FromQuery] int? maxCalories,
        [FromQuery] double? minProtein,
        [FromQuery] double? maxProtein)
    {
        var query = _db.MasterMealTemplates.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(m => m.Name.ToLower().Contains(search.ToLower()) || 
                                     (m.PlannerNotes != null && m.PlannerNotes.ToLower().Contains(search.ToLower())));

        if (!string.IsNullOrWhiteSpace(timing))
            query = query.Where(m => m.Timing.ToLower() == timing.ToLower());

        if (minCost.HasValue)
            query = query.Where(m => m.EstimatedTotalCost >= minCost.Value);

        if (maxCost.HasValue)
            query = query.Where(m => m.EstimatedTotalCost <= maxCost.Value);

        if (minCalories.HasValue)
            query = query.Where(m => m.TotalCaloriesKcal >= minCalories.Value);

        if (maxCalories.HasValue)
            query = query.Where(m => m.TotalCaloriesKcal <= maxCalories.Value);

        if (minProtein.HasValue)
            query = query.Where(m => m.TotalProteinG >= minProtein.Value);

        if (maxProtein.HasValue)
            query = query.Where(m => m.TotalProteinG <= maxProtein.Value);

        var results = await query.OrderBy(m => m.Timing).ThenBy(m => m.Name).ToListAsync();
        return Ok(results);
    }

    [HttpPost("templates/add-from-catalog")]
    public async Task<IActionResult> AddFromCatalog([FromBody] AddFromCatalogRequest body)
    {
        if (body.MasterMealTemplateId <= 0) return BadRequest("Master meal template ID is required.");

        var userId = GetUserId();
        var master = await _db.MasterMealTemplates.FirstOrDefaultAsync(m => m.Id == body.MasterMealTemplateId);
        if (master is null) return NotFound("Master meal not found.");

        // Check if user already has this meal (by master FK)
        var existing = await _db.MealTemplates
            .FirstOrDefaultAsync(m => m.UserId == userId && m.MasterMealTemplateId == master.Id);

        if (existing is not null)
            return BadRequest("This meal is already in your library.");

        await EnsureMissingIngredientsFromJsonAsync(master.IngredientsJson ?? "[]");

        // Clone the master meal to user's library
        var cloned = new MealTemplate
        {
            UserId = userId,
            Name = master.Name,
            Timing = master.Timing,
            TimeOfDay = master.TimeOfDay,
            IngredientsJson = master.IngredientsJson ?? "[]",
            Recipe = master.Recipe ?? string.Empty,
            ImageUrl = master.ImageUrl,
            MasterMealTemplateId = master.Id,
            CreatedAt = DateTime.UtcNow,
        };

        _db.MealTemplates.Add(cloned);
        await _db.SaveChangesAsync();

        // Reload with master details
        cloned = await _db.MealTemplates
            .Include(m => m.MasterMealTemplate)
            .FirstAsync(m => m.Id == cloned.Id);

        return Ok(cloned);
    }

    private async Task EnsureMissingIngredientsFromJsonAsync(string? ingredientsJson)
    {
        var parsedNames = ExtractIngredientNames(ingredientsJson);
        if (parsedNames.Count == 0) return;

        var normalizedRequested = parsedNames
            .Select(NormalizeIngredientName)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedRequested.Count == 0) return;

        var existingNames = await _db.MealIngredients
            .Select(i => i.Name)
            .ToListAsync();

        var existingNormalized = existingNames
            .Select(NormalizeIngredientName)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toCreate = parsedNames
            .Where(name => !existingNormalized.Contains(NormalizeIngredientName(name)))
            .GroupBy(name => NormalizeIngredientName(name), StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

        foreach (var name in toCreate)
        {
            _db.MealIngredients.Add(new MealIngredient
            {
                Name = name,
                CaloriesKcal = 0,
                ProteinG = 0,
                CarbsG = 0,
                FatsG = 0,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }

    private static List<string> ExtractIngredientNames(string? ingredientsJson)
    {
        var names = new List<string>();
        if (string.IsNullOrWhiteSpace(ingredientsJson)) return names;

        try
        {
            using var doc = JsonDocument.Parse(ingredientsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return names;

            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (element.ValueKind != JsonValueKind.Object) continue;

                if (element.TryGetProperty("name", out var nameProp) && nameProp.ValueKind == JsonValueKind.String)
                {
                    var name = nameProp.GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(name)) names.Add(name);
                }
            }
        }
        catch
        {
            return names;
        }

        return names;
    }

    private static string NormalizeIngredientName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        return name.Trim().ToLowerInvariant();
    }

    // ─── Weekly Meal Plan ─────────────────────────────────────────────────

    [HttpGet("plan")]
    public async Task<IActionResult> GetPlan()
    {
        var userId = GetUserId();
        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        return Ok(plan);
    }

    [HttpPut("plan")]
    public async Task<IActionResult> UpsertPlan([FromBody] UpsertPlanRequestDto body)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(body.PlanJson))
            return BadRequest("planJson is required.");

        var planJson = body.PlanJson;

        // Validate that plan_json can be parsed and all referenced meals exist.
        // Supports mixed legacy/new formats in the same payload.
        Dictionary<string, List<MealAssignment>> planData;
        try
        {
            planData = ParsePlanJsonFlexible(planJson);
        }
        catch
        {
            return BadRequest("Invalid plan JSON format. Each date should map to an array of meal objects with mealTemplateId and optional timeOfDay.");
        }

        // Extract all unique meal template IDs and validate they exist for this user
        var allMealIds = planData.Values
            .SelectMany(meals => meals.Select(m => m.MealTemplateId))
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        var existingMeals = await _db.MealTemplates
            .Where(m => m.UserId == userId && allMealIds.Contains(m.Id))
            .Select(m => new { m.Id, m.Timing, m.TimeOfDay })
            .ToListAsync();

        // Canonicalize to one format and silently drop stale/invalid IDs.
        var mealLookup = existingMeals.ToDictionary(m => m.Id, m => m);
        var sanitized = new Dictionary<string, List<MealAssignment>>(StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in planData)
        {
            sanitized[kvp.Key] = (kvp.Value ?? new List<MealAssignment>())
                .Where(m => m.MealTemplateId > 0 && mealLookup.ContainsKey(m.MealTemplateId))
                .Select(m =>
                {
                    var template = mealLookup[m.MealTemplateId];
                    var effectiveTime = string.IsNullOrWhiteSpace(m.TimeOfDay)
                        ? ResolveDefaultTimeOfDay(template.Timing, template.TimeOfDay)
                        : m.TimeOfDay;
                    return new MealAssignment(m.MealTemplateId, effectiveTime);
                })
                .ToList();
        }

        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        if (plan is null)
        {
            plan = new WeeklyMealPlan { UserId = userId };
            _db.WeeklyMealPlans.Add(plan);
        }
        plan.PlanJson = JsonSerializer.Serialize(sanitized);
        plan.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    [HttpPost("plan/copy-last-week")]
    public async Task<IActionResult> CopyLastWeek([FromBody] CopyLastWeekRequestDto body)
    {
        if (!DateOnly.TryParse(body.SourceDate, out var sourceDate))
            return BadRequest("Invalid sourceDate format. Use yyyy-MM-dd");

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(body.TargetDate) && !DateOnly.TryParse(body.TargetDate, out targetDate))
            return BadRequest("Invalid targetDate format. Use yyyy-MM-dd");

        var userId = GetUserId();
        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        if (plan is null)
        {
            plan = new WeeklyMealPlan { UserId = userId, PlanJson = "{}", UpdatedAt = DateTime.UtcNow };
            _db.WeeklyMealPlans.Add(plan);
        }

        Dictionary<string, List<MealAssignment>> data;
        try
        {
            data = ParsePlanJsonFlexible(plan.PlanJson);
        }
        catch
        {
            data = new Dictionary<string, List<MealAssignment>>();
        }

        var sourceWeekStart = sourceDate.AddDays(-(int)sourceDate.DayOfWeek);
        var targetWeekStart = targetDate.AddDays(-(int)targetDate.DayOfWeek);

        // Check if source week has any meals at all — abort if empty
        var sourceWeekHasMeals = false;
        for (var i = 0; i < 7; i++)
        {
            var sourceDay = sourceWeekStart.AddDays(i);
            var sourceDateKey = sourceDay.ToString("yyyy-MM-dd");
            var sourceWeekdayKey = sourceDay.DayOfWeek.ToString().ToLowerInvariant();
            if ((data.TryGetValue(sourceDateKey, out var check1) && check1?.Count > 0) ||
                (data.TryGetValue(sourceWeekdayKey, out var check2) && check2?.Count > 0))
            {
                sourceWeekHasMeals = true;
                break;
            }
        }

        if (!sourceWeekHasMeals)
            return Ok(plan);

        for (var i = 0; i < 7; i++)
        {
            var sourceDay = sourceWeekStart.AddDays(i);
            var targetDay = targetWeekStart.AddDays(i);
            var sourceDateKey = sourceDay.ToString("yyyy-MM-dd");
            var sourceWeekdayKey = sourceDay.DayOfWeek.ToString().ToLowerInvariant();
            var targetDateKey = targetDay.ToString("yyyy-MM-dd");

            List<MealAssignment>? sourceMeals = null;
            if (data.TryGetValue(sourceDateKey, out var fromDateKey) && fromDateKey is not null)
            {
                sourceMeals = fromDateKey;
            }
            else if (data.TryGetValue(sourceWeekdayKey, out var fromWeekdayKey) && fromWeekdayKey is not null)
            {
                sourceMeals = fromWeekdayKey;
            }

            if (sourceMeals is null)
            {
                data.Remove(targetDateKey);
            }
            else
            {
                // Preserve meal objects including any timeOfDay overrides
                data[targetDateKey] = sourceMeals.Distinct().ToList();
            }
        }

        plan.PlanJson = JsonSerializer.Serialize(data);
        plan.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    // ─── Daily Meal Logs ────────────────────────────────────────────────

    [HttpGet("logs/{date}")]
    public async Task<IActionResult> GetDailyLog(string date)
    {
        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest("Invalid date format. Use yyyy-MM-dd");

        var userId = GetUserId();
        var log = await _db.DailyMealLogs.FirstOrDefaultAsync(l => l.UserId == userId && l.Date == parsedDate);
        if (log is null)
        {
            return Ok(new
            {
                date = parsedDate.ToString("yyyy-MM-dd"),
                mealIds = Array.Empty<int>()
            });
        }

        int[] ids;
        try
        {
            ids = log.MealIdsJson.RootElement.Deserialize<int[]>() ?? Array.Empty<int>();
        }
        catch
        {
            ids = Array.Empty<int>();
        }

        return Ok(new
        {
            date = log.Date.ToString("yyyy-MM-dd"),
            mealIds = ids
        });
    }

    [HttpPut("logs")]
    public async Task<IActionResult> UpsertDailyLog([FromBody] UpsertDailyLogRequestDto body)
    {
        if (!DateOnly.TryParse(body.Date, out var parsedDate))
            return BadRequest("Invalid date format. Use yyyy-MM-dd");

        var userId = GetUserId();
        var existing = await _db.DailyMealLogs.FirstOrDefaultAsync(l => l.UserId == userId && l.Date == parsedDate);
        var normalizedIds = (body.MealIds ?? new List<int>()).Distinct().ToArray();
        var json = System.Text.Json.JsonSerializer.SerializeToDocument(normalizedIds);

        if (existing is null)
        {
            existing = new DailyMealLog
            {
                UserId = userId,
                Date = parsedDate,
                MealIdsJson = json,
                UpdatedAt = DateTime.UtcNow
            };
            _db.DailyMealLogs.Add(existing);
        }
        else
        {
            existing.MealIdsJson = json;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            date = parsedDate.ToString("yyyy-MM-dd"),
            mealIds = normalizedIds
        });
    }

    public record MealAssignment(int MealTemplateId, string? TimeOfDay);

    private static Dictionary<string, List<MealAssignment>> ParsePlanJsonFlexible(string json)
    {
        var result = new Dictionary<string, List<MealAssignment>>(StringComparer.OrdinalIgnoreCase);
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            return result;

        foreach (var day in doc.RootElement.EnumerateObject())
        {
            if (day.Value.ValueKind != JsonValueKind.Array)
            {
                result[day.Name] = new List<MealAssignment>();
                continue;
            }

            var assignments = new List<MealAssignment>();
            foreach (var item in day.Value.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Number)
                {
                    if (item.TryGetInt32(out var id))
                        assignments.Add(new MealAssignment(id, null));
                    continue;
                }

                if (item.ValueKind != JsonValueKind.Object)
                    continue;

                int mealTemplateId = 0;
                string? timeOfDay = null;

                foreach (var prop in item.EnumerateObject())
                {
                    var name = prop.Name.ToLowerInvariant();
                    if ((name == "mealtemplateid" || name == "meal_template_id") && prop.Value.ValueKind == JsonValueKind.Number)
                    {
                        if (prop.Value.TryGetInt32(out var id)) mealTemplateId = id;
                    }
                    else if ((name == "timeofday" || name == "time_of_day") && prop.Value.ValueKind == JsonValueKind.String)
                    {
                        timeOfDay = prop.Value.GetString();
                    }
                }

                if (mealTemplateId != 0)
                    assignments.Add(new MealAssignment(mealTemplateId, timeOfDay));
            }

            result[day.Name] = assignments;
        }

        return result;
    }

    private static string ResolveDefaultTimeOfDay(string? timing, string? existingTemplateTimeOfDay)
    {
        if (!string.IsNullOrWhiteSpace(existingTemplateTimeOfDay))
            return existingTemplateTimeOfDay.Trim();

        var key = (timing ?? string.Empty).Trim().ToLowerInvariant();
        return key switch
        {
            "breakfast" or "bf" => "08:00",
            "lunch" => "13:00",
            "dinner" => "20:00",
            "pre-workout" or "preworkout" => "16:00",
            "post-workout" or "postworkout" => "18:00",
            "snack" => "17:00",
            _ => "12:00",
        };
    }
}
