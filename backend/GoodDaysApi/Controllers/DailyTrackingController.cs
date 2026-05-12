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

        if (record != null)
        {
            // fetch note separately; may not exist
            var noteRec = await _db.DailyNotes
                .Where(n => n.UserId == userId && n.Date == utcDate)
                .Select(n => n.Note)
                .FirstOrDefaultAsync();
            record.Note = noteRec;
        }

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

        // track note separately from the main entity
        DailyNote? noteRec = await _db.DailyNotes
            .Where(n => n.UserId == req.UserId && n.Date == requestDate)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            existing.SleepHours = req.SleepHours;
            existing.WorkoutMinutes = req.WorkoutMinutes;
            existing.PhoneMinutes = req.PhoneMinutes;
            existing.Sunlight = req.Sunlight;
            existing.Mood = req.Mood;
            existing.WaterCups = req.WaterCups ?? existing.WaterCups;
            existing.WaterGoalCups = req.WaterGoalCups ?? existing.WaterGoalCups;
            if (req.Calories.HasValue) existing.Calories = req.Calories;

            // handle note update/removal
            if (string.IsNullOrWhiteSpace(req.Note))
            {
                if (noteRec != null)
                    _db.DailyNotes.Remove(noteRec);
            }
            else
            {
                if (noteRec != null)
                    noteRec.Note = req.Note;
                else
                    _db.DailyNotes.Add(new DailyNote
                    {
                        UserId = req.UserId,
                        Date = requestDate,
                        Note = req.Note
                    });
            }

            await _db.SaveChangesAsync();
            existing.Note = req.Note;
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
            WaterCups = req.WaterCups ?? 0,
            WaterGoalCups = req.WaterGoalCups ?? 8,
            Calories = req.Calories,
        };
        _db.DailyTrackings.Add(newRec);

        if (!string.IsNullOrWhiteSpace(req.Note))
        {
            _db.DailyNotes.Add(new DailyNote
            {
                UserId = req.UserId,
                Date = requestDate,
                Note = req.Note
            });
        }

        await _db.SaveChangesAsync();
        newRec.Note = req.Note;
        return Ok(newRec);
    }
}

public record SaveDailyTrackingRequest(
    int UserId,
    DateTime Date,
    decimal SleepHours,
    int WorkoutMinutes,
    int PhoneMinutes,
    bool Sunlight,
    int Mood,
    string? Note,
    int? WaterCups,
    int? WaterGoalCups,
    int? Calories
);
