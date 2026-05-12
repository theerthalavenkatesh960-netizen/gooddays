using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WaterController : ControllerBase
{
    private readonly AppDbContext _db;
    
    public WaterController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Get Water Log ────────────────────────────────────────────────────

    [HttpGet("logs")]
    public async Task<IActionResult> GetDailyWaterLog([FromQuery] string date)
    {
        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd" });

        var userId = GetUserId();
        var log = await _db.DailyWaterLogs
            .FirstOrDefaultAsync(w => w.UserId == userId && w.Date == parsedDate);

        if (log is null)
        {
            // Return default log if not found
            return Ok(new
            {
                date = parsedDate.ToString("yyyy-MM-dd"),
                mlConsumed = 0,
                goalMl = 2000,
                unit = "ml"
            });
        }

        return Ok(new
        {
            date = log.Date.ToString("yyyy-MM-dd"),
            mlConsumed = log.MlConsumed,
            goalMl = log.GoalMl,
            unit = log.Unit
        });
    }

    // ─── Log Water Intake ─────────────────────────────────────────────────

    [HttpPost("logs")]
    public async Task<IActionResult> LogWaterIntake([FromBody] LogWaterIntakeRequest body)
    {
        if (body?.Date is null || !DateOnly.TryParse(body.Date, out var date))
            return BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd" });
        
        if (body.MlConsumed < 0)
            return BadRequest(new { error = "MlConsumed must be >= 0" });

        var userId = GetUserId();
        var log = await _db.DailyWaterLogs
            .FirstOrDefaultAsync(w => w.UserId == userId && w.Date == date);

        if (log is null)
        {
            log = new DailyWaterLog
            {
                UserId = userId,
                Date = date,
                MlConsumed = body.MlConsumed,
                GoalMl = body.GoalMl ?? 2000,
                Unit = "ml",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.DailyWaterLogs.Add(log);
        }
        else
        {
            log.MlConsumed = body.MlConsumed;
            log.GoalMl = body.GoalMl ?? log.GoalMl;
            log.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            date = log.Date.ToString("yyyy-MM-dd"),
            mlConsumed = log.MlConsumed,
            goalMl = log.GoalMl,
            unit = log.Unit
        });
    }

    // ─── Increment Water Intake ───────────────────────────────────────────

    [HttpPost("logs/increment")]
    public async Task<IActionResult> IncrementWaterIntake([FromBody] IncrementWaterIntakeRequest body)
    {
        if (body?.Date is null || !DateOnly.TryParse(body.Date, out var date))
            return BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd" });
        
        var incrementMl = body.IncrementMl ?? 250;
        if (incrementMl <= 0)
            return BadRequest(new { error = "IncrementMl must be > 0" });

        var userId = GetUserId();
        var log = await _db.DailyWaterLogs
            .FirstOrDefaultAsync(w => w.UserId == userId && w.Date == date);

        if (log is null)
        {
            log = new DailyWaterLog
            {
                UserId = userId,
                Date = date,
                MlConsumed = incrementMl,
                GoalMl = 2000,
                Unit = "ml",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.DailyWaterLogs.Add(log);
        }
        else
        {
            log.MlConsumed += incrementMl;
            log.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            date = log.Date.ToString("yyyy-MM-dd"),
            mlConsumed = log.MlConsumed,
            goalMl = log.GoalMl,
            unit = log.Unit
        });
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────

public class LogWaterIntakeRequest
{
    public string? Date { get; set; }
    public int MlConsumed { get; set; }
    public int? GoalMl { get; set; }
}

public class IncrementWaterIntakeRequest
{
    public string? Date { get; set; }
    public int? IncrementMl { get; set; }
}
