using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/routineblocktemplate")]
[Authorize]
public class RoutineBlockTemplateController : ControllerBase
{
    private readonly AppDbContext _db;
    public RoutineBlockTemplateController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // GET /api/routineblocktemplate
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var templates = await _db.RoutineBlockTemplates
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.Title)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                t.Title,
                t.Category,
                t.Color,
                t.DefaultStartTime,
                t.DefaultEndTime,
                t.CreatedAt,
                t.UpdatedAt,
            })
            .ToListAsync();

        return Ok(templates);
    }

    // POST /api/routineblocktemplate
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TemplateRequest body)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest("Title is required.");

        var template = new RoutineBlockTemplate
        {
            UserId = userId,
            Title = body.Title.Trim(),
            Category = body.Category?.Trim(),
            Color = body.Color?.Trim(),
            DefaultStartTime = body.DefaultStartTime?.Trim(),
            DefaultEndTime = body.DefaultEndTime?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.RoutineBlockTemplates.Add(template);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("A template with this title already exists.");
        }

        return Ok(MapTemplate(template));
    }

    // PUT /api/routineblocktemplate/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] TemplateRequest body)
    {
        var userId = GetUserId();
        var template = await _db.RoutineBlockTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (template is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(body.Title)) template.Title = body.Title.Trim();
        template.Category = body.Category?.Trim();
        template.Color = body.Color?.Trim();
        template.DefaultStartTime = body.DefaultStartTime?.Trim();
        template.DefaultEndTime = body.DefaultEndTime?.Trim();
        template.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("A template with this title already exists.");
        }

        return Ok(MapTemplate(template));
    }

    // DELETE /api/routineblocktemplate/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var template = await _db.RoutineBlockTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (template is null) return NotFound();

        _db.RoutineBlockTemplates.Remove(template);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/routineblocktemplate/{id}/stats
    // Returns completion stats derived from daily_routine_logs via template_id.
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetStats(int id, [FromQuery] int days = 90)
    {
        var userId = GetUserId();
        var template = await _db.RoutineBlockTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (template is null) return NotFound();

        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-Math.Abs(days)));

        // All routine_blocks linked to this template for this user
        var blockIds = await _db.RoutineBlocks
            .Where(b => b.TemplateId == id)
            .Select(b => b.Id)
            .ToListAsync();

        if (blockIds.Count == 0)
        {
            return Ok(new
            {
                templateId = id,
                title = template.Title,
                totalCompletions = 0,
                totalDaysLogged = 0,
                completionRate = 0.0,
                lastCompleted = (DateOnly?)null,
                currentStreak = 0,
                dailyCompletions = Array.Empty<object>(),
            });
        }

        var logs = await _db.DailyRoutineLogs
            .Where(l => l.UserId == userId
                     && l.RoutineBlockId.HasValue
                     && blockIds.Contains(l.RoutineBlockId.Value)
                     && l.Date >= cutoff)
            .Select(l => new { l.Date, l.Status })
            .ToListAsync();

        var completedDates = logs
            .Where(l => l.Status == "completed")
            .Select(l => l.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        var totalCompletions = completedDates.Count;
        var totalDaysLogged = logs.Select(l => l.Date).Distinct().Count();
        var completionRate = totalDaysLogged > 0
            ? Math.Round((double)totalCompletions / totalDaysLogged * 100, 1)
            : 0.0;

        // Current streak (consecutive days completed ending today or yesterday)
        int streak = 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var checkDate = completedDates.Count > 0 && completedDates[0] >= today.AddDays(-1)
            ? completedDates[0]
            : (DateOnly?)null;

        if (checkDate.HasValue)
        {
            var dateSet = completedDates.ToHashSet();
            var cur = checkDate.Value;
            while (dateSet.Contains(cur))
            {
                streak++;
                cur = cur.AddDays(-1);
            }
        }

        var dailyCompletions = completedDates
            .Select(d => new { date = d.ToString("yyyy-MM-dd") })
            .ToList();

        return Ok(new
        {
            templateId = id,
            title = template.Title,
            totalCompletions,
            totalDaysLogged,
            completionRate,
            lastCompleted = completedDates.Count > 0 ? completedDates[0].ToString("yyyy-MM-dd") : null,
            currentStreak = streak,
            dailyCompletions,
        });
    }

    private static object MapTemplate(RoutineBlockTemplate t) => new
    {
        t.Id,
        t.UserId,
        t.Title,
        t.Category,
        t.Color,
        t.DefaultStartTime,
        t.DefaultEndTime,
        t.CreatedAt,
        t.UpdatedAt,
    };
}

public record TemplateRequest(
    string Title,
    string? Category,
    string? Color,
    string? DefaultStartTime,
    string? DefaultEndTime
);
