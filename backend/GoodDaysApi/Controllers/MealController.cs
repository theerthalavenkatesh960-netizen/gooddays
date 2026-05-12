using GoodDaysApi.Data;
using GoodDaysApi.Models;
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
    public MealController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Ingredients ─────────────────────────────────────────────────────

    [HttpGet("ingredients")]
    public async Task<IActionResult> GetIngredients()
    {
        var userId = GetUserId();
        return Ok(await _db.MealIngredients.Where(i => i.UserId == userId).OrderBy(i => i.Name).ToListAsync());
    }

    [HttpPost("ingredients")]
    public async Task<IActionResult> CreateIngredient([FromBody] MealIngredient body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.MealIngredients.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpDelete("ingredients/{id}")]
    public async Task<IActionResult> DeleteIngredient(int id)
    {
        var userId = GetUserId();
        var item = await _db.MealIngredients.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
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
        return Ok(await _db.MealTemplates.Where(m => m.UserId == userId).OrderBy(m => m.Name).ToListAsync());
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] MealTemplate body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.MealTemplates.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
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

    // ─── Weekly Meal Plan ─────────────────────────────────────────────────

    [HttpGet("plan")]
    public async Task<IActionResult> GetPlan()
    {
        var userId = GetUserId();
        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        return Ok(plan);
    }

    [HttpPut("plan")]
    public async Task<IActionResult> UpsertPlan([FromBody] UpsertPlanRequest body)
    {
        var userId = GetUserId();
        
        // Validate that plan_json can be parsed and all referenced meals exist
        Dictionary<string, List<MealAssignment>> planData;
        try
        {
            planData = JsonSerializer.Deserialize<Dictionary<string, List<MealAssignment>>>(body.PlanJson) 
                ?? new Dictionary<string, List<MealAssignment>>();
        }
        catch
        {
            return BadRequest("Invalid plan JSON format. Each date should map to an array of meal objects with mealTemplateId and timeOfDay.");
        }

        // Extract all unique meal template IDs and validate they exist for this user
        var allMealIds = planData.Values
            .SelectMany(meals => meals.Select(m => m.MealTemplateId))
            .Distinct()
            .ToList();

        var existingMeals = await _db.MealTemplates
            .Where(m => m.UserId == userId && allMealIds.Contains(m.Id))
            .Select(m => m.Id)
            .ToListAsync();

        var invalidIds = allMealIds.Except(existingMeals).ToList();
        if (invalidIds.Any())
            return BadRequest($"Invalid meal template IDs: {string.Join(", ", invalidIds)}");

        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        if (plan is null)
        {
            plan = new WeeklyMealPlan { UserId = userId };
            _db.WeeklyMealPlans.Add(plan);
        }
        plan.PlanJson = body.PlanJson;
        plan.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    [HttpPost("plan/copy-last-week")]
    public async Task<IActionResult> CopyLastWeek([FromBody] CopyLastWeekRequest body)
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
            data = JsonSerializer.Deserialize<Dictionary<string, List<MealAssignment>>>(plan.PlanJson) 
                ?? new Dictionary<string, List<MealAssignment>>();
        }
        catch
        {
            // Fallback: if old format (List<int>) is detected, try to migrate
            try
            {
                var oldData = JsonSerializer.Deserialize<Dictionary<string, List<int>>>(plan.PlanJson);
                if (oldData != null)
                {
                    data = oldData.ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Select(id => new MealAssignment(id, null)).ToList()
                    );
                }
                else
                {
                    data = new Dictionary<string, List<MealAssignment>>();
                }
            }
            catch
            {
                data = new Dictionary<string, List<MealAssignment>>();
            }
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
            return BadRequest("Last week has no meals to copy.");

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
    public async Task<IActionResult> UpsertDailyLog([FromBody] UpsertDailyLogRequest body)
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

    public record UpsertPlanRequest(string PlanJson);
    public record CopyLastWeekRequest(string SourceDate, string? TargetDate);
    public record UpsertDailyLogRequest(string Date, List<int> MealIds);
    public record MealAssignment(int MealTemplateId, string? TimeOfDay);
}
