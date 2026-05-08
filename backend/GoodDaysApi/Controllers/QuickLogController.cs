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
public class QuickLogController : ControllerBase
{
    private readonly AppDbContext _db;
    
    public QuickLogController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Log Quick Entry ──────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> LogQuickEntry([FromBody] LogQuickEntryRequest body)
    {
        if (string.IsNullOrWhiteSpace(body?.Type))
            return BadRequest(new { error = "Type is required" });

        var validTypes = new[] { "workout", "meal", "expense", "water", "task" };
        if (!validTypes.Contains(body.Type))
            return BadRequest(new { error = $"Type must be one of: {string.Join(", ", validTypes)}" });

        if (body.Payload is null)
            return BadRequest(new { error = "Payload is required" });

        var userId = GetUserId();
        var date = DateOnly.TryParse(body.Date, out var parsedDate) 
            ? parsedDate 
            : DateOnly.FromDateTime(DateTime.Now);

        var entry = new QuickLogEntry
        {
            UserId = userId,
            Date = date,
            Type = body.Type,
            PayloadJson = JsonSerializer.Serialize(body.Payload),
            CreatedAt = DateTime.UtcNow
        };

        _db.QuickLogEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = entry.Id,
            date = entry.Date.ToString("yyyy-MM-dd"),
            type = entry.Type,
            payload = body.Payload,
            createdAt = entry.CreatedAt.ToIso8601String()
        });
    }

    // ─── Get Quick Log History ────────────────────────────────────────────

    [HttpGet("history")]
    public async Task<IActionResult> GetQuickLogHistory(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? type)
    {
        if (string.IsNullOrWhiteSpace(from) || !DateOnly.TryParse(from, out var fromDate))
            return BadRequest(new { error = "Invalid 'from' date. Use yyyy-MM-dd" });

        if (string.IsNullOrWhiteSpace(to) || !DateOnly.TryParse(to, out var toDate))
            return BadRequest(new { error = "Invalid 'to' date. Use yyyy-MM-dd" });

        var userId = GetUserId();
        var query = _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Date >= fromDate && e.Date <= toDate);

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(e => e.Type == type);
        }

        var entries = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return Ok(entries.Select(e => new
        {
            id = e.Id,
            date = e.Date.ToString("yyyy-MM-dd"),
            type = e.Type,
            payload = JsonSerializer.Deserialize<object>(e.PayloadJson),
            createdAt = e.CreatedAt.ToIso8601String()
        }));
    }

    // ─── Get Today's Quick Logs ────────────────────────────────────────────

    [HttpGet("today")]
    public async Task<IActionResult> GetTodayQuickLogs()
    {
        var userId = GetUserId();
        var today = DateOnly.FromDateTime(DateTime.Now);

        var entries = await _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Date == today)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return Ok(entries.Select(e => new
        {
            id = e.Id,
            date = e.Date.ToString("yyyy-MM-dd"),
            type = e.Type,
            payload = JsonSerializer.Deserialize<object>(e.PayloadJson),
            createdAt = e.CreatedAt.ToIso8601String()
        }));
    }

    // ─── Delete Quick Log Entry ────────────────────────────────────────────

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuickLogEntry(int id)
    {
        var userId = GetUserId();
        var entry = await _db.QuickLogEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (entry is null)
            return NotFound(new { error = "Quick log entry not found" });

        _db.QuickLogEntries.Remove(entry);
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────

public class LogQuickEntryRequest
{
    public string? Type { get; set; }
    public Dictionary<string, object>? Payload { get; set; }
    public string? Date { get; set; }
}

// ─── Extension Methods ────────────────────────────────────────────────────

public static class DateTimeExtensions
{
    public static string ToIso8601String(this DateTime dt)
        => dt.Kind == DateTimeKind.Utc || dt.Kind == DateTimeKind.Unspecified
            ? dt.ToString("O")
            : dt.ToUniversalTime().ToString("O");
}
