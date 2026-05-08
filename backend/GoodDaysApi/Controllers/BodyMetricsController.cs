using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BodyMetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public BodyMetricsController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("No user id claim"));

    // GET api/bodymetrics/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(new { heightCm = user.HeightCm, targetWeightKg = user.TargetWeightKg });
    }

    // PUT api/bodymetrics/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateBodyProfileRequest req)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (req.HeightCm.HasValue) user.HeightCm = req.HeightCm;
        if (req.TargetWeightKg.HasValue) user.TargetWeightKg = req.TargetWeightKg;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { heightCm = user.HeightCm, targetWeightKg = user.TargetWeightKg });
    }

    // GET api/bodymetrics/weight-logs?from=2026-01-01&to=2026-05-09
    [HttpGet("weight-logs")]
    public async Task<IActionResult> GetWeightLogs([FromQuery] string? from, [FromQuery] string? to)
    {
        var userId = GetUserId();
        var query = _db.BodyWeightLogs.Where(l => l.UserId == userId);

        if (!string.IsNullOrEmpty(from) && DateOnly.TryParse(from, out var fromDate))
            query = query.Where(l => l.Date >= fromDate);

        if (!string.IsNullOrEmpty(to) && DateOnly.TryParse(to, out var toDate))
            query = query.Where(l => l.Date <= toDate);

        var logs = await query
            .OrderBy(l => l.Date)
            .Select(l => new { date = l.Date.ToString("yyyy-MM-dd"), weightKg = l.WeightKg, note = l.Note })
            .ToListAsync();

        return Ok(logs);
    }

    // POST api/bodymetrics/weight-logs
    [HttpPost("weight-logs")]
    public async Task<IActionResult> LogWeight([FromBody] LogWeightRequest req)
    {
        var userId = GetUserId();
        var date = req.Date.HasValue ? req.Date.Value : DateOnly.FromDateTime(DateTime.UtcNow);

        var existing = await _db.BodyWeightLogs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.Date == date);

        if (existing != null)
        {
            existing.WeightKg = req.WeightKg;
            existing.Note = req.Note;
        }
        else
        {
            _db.BodyWeightLogs.Add(new BodyWeightLog
            {
                UserId = userId,
                Date = date,
                WeightKg = req.WeightKg,
                Note = req.Note,
                LoggedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { date = date.ToString("yyyy-MM-dd"), weightKg = req.WeightKg });
    }

    // DELETE api/bodymetrics/weight-logs/{date}
    [HttpDelete("weight-logs/{date}")]
    public async Task<IActionResult> DeleteWeightLog(string date)
    {
        var userId = GetUserId();
        if (!DateOnly.TryParse(date, out var parsedDate)) return BadRequest("Invalid date");

        var log = await _db.BodyWeightLogs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.Date == parsedDate);

        if (log == null) return NotFound();

        _db.BodyWeightLogs.Remove(log);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record UpdateBodyProfileRequest(decimal? HeightCm, decimal? TargetWeightKg);
public record LogWeightRequest(decimal WeightKg, DateOnly? Date, string? Note);
