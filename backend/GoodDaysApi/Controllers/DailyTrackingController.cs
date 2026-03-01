using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DailyTrackingController : ControllerBase
{
    private readonly AppDbContext _db;

    public DailyTrackingController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetForUser(int userId, [FromQuery] DateTime date)
    {
        // ensure we treat the incoming query date as UTC to satisfy Npgsql's
        // requirement that timestamp with time zone values have a Kind of UTC.
        var utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc).Date;
        var record = await _db.DailyTrackings
            .Where(d => d.UserId == userId && d.Date == utcDate)
            .FirstOrDefaultAsync();
        return Ok(record);
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDailyTrackingRequest req)
    {
        // convert request date to UTC before querying/creating
        var requestDate = DateTime.SpecifyKind(req.Date, DateTimeKind.Utc).Date;
        var existing = await _db.DailyTrackings
            .Where(d => d.UserId == req.UserId && d.Date == requestDate)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            existing.SleepHours = req.SleepHours;
            existing.WorkoutMinutes = req.WorkoutMinutes;
            existing.PhoneMinutes = req.PhoneMinutes;
            existing.Sunlight = req.Sunlight;
            existing.Mood = req.Mood;
            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        var newRec = new DailyTracking
        {
            UserId = req.UserId,
            Date = requestDate,
            SleepHours = req.SleepHours,
            WorkoutMinutes = req.WorkoutMinutes,
            PhoneMinutes = req.PhoneMinutes,
            Sunlight = req.Sunlight,
            Mood = req.Mood,
        };
        _db.DailyTrackings.Add(newRec);
        await _db.SaveChangesAsync();
        return Ok(newRec);
    }
}

public record SaveDailyTrackingRequest(int UserId, DateTime Date, decimal SleepHours, int WorkoutMinutes, int PhoneMinutes, bool Sunlight, int Mood);
