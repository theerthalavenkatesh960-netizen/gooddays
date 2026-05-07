using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RemindersController : ControllerBase
{
    private readonly AppDbContext _db;
    public RemindersController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        return Ok(await _db.Reminders.Where(r => r.UserId == userId).OrderBy(r => r.Time).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Reminder body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.Reminders.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Reminder body)
    {
        var userId = GetUserId();
        var reminder = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (reminder is null) return NotFound();
        reminder.Title = body.Title;
        reminder.Description = body.Description;
        reminder.Time = body.Time;
        reminder.Frequency = body.Frequency;
        reminder.ActiveDays = body.ActiveDays;
        reminder.IsEnabled = body.IsEnabled;
        await _db.SaveChangesAsync();
        return Ok(reminder);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var reminder = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (reminder is null) return NotFound();
        _db.Reminders.Remove(reminder);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Logs (mark done) ────────────────────────────────────────────────

    [HttpGet("logs/today")]
    public async Task<IActionResult> GetTodayLogs()
    {
        var userId = GetUserId();
        var today = DateTime.UtcNow.Date;
        var reminders = await _db.Reminders.Where(r => r.UserId == userId && r.IsEnabled).ToListAsync();
        var logs = await _db.ReminderLogs.Where(l => l.Date == today && reminders.Select(r => r.Id).Contains(l.ReminderId)).ToListAsync();

        return Ok(new { reminders, logs });
    }

    [HttpPost("{id}/log")]
    public async Task<IActionResult> MarkDone(int id)
    {
        var userId = GetUserId();
        if (!await _db.Reminders.AnyAsync(r => r.Id == id && r.UserId == userId)) return NotFound();

        var today = DateTime.UtcNow.Date;
        var existing = await _db.ReminderLogs.FirstOrDefaultAsync(l => l.ReminderId == id && l.Date == today);

        if (existing is not null)
        {
            // Toggle
            existing.MarkedDone = !existing.MarkedDone;
            existing.MarkedDoneAt = existing.MarkedDone ? DateTime.UtcNow : null;
        }
        else
        {
            _db.ReminderLogs.Add(new ReminderLog { ReminderId = id, Date = today, MarkedDone = true, MarkedDoneAt = DateTime.UtcNow });
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int days = 30)
    {
        var userId = GetUserId();
        var since = DateTime.UtcNow.Date.AddDays(-days);
        var reminderIds = await _db.Reminders.Where(r => r.UserId == userId).Select(r => r.Id).ToListAsync();
        var logs = await _db.ReminderLogs
            .Where(l => reminderIds.Contains(l.ReminderId) && l.Date >= since && l.MarkedDone)
            .ToListAsync();
        var grouped = logs
            .GroupBy(l => l.Date.ToString("yyyy-MM-dd"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .ToList();
        return Ok(grouped);
    }
}
