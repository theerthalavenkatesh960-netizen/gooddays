using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    public record UpsertPlanRequest(string PlanJson);
}
