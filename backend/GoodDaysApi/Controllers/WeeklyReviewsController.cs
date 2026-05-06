using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeeklyReviewsController : ControllerBase
{
    private readonly AppDbContext _db;
    public WeeklyReviewsController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(User.FindFirst("userId")!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        return Ok(await _db.WeeklyReviews.Where(w => w.UserId == userId).OrderByDescending(w => w.WeekStartDate).ToListAsync());
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentWeek()
    {
        var userId = GetUserId();
        // Week starts on Monday
        var today = DateTime.UtcNow.Date;
        var dayOfWeek = (int)today.DayOfWeek;
        var monday = today.AddDays(dayOfWeek == 0 ? -6 : -(dayOfWeek - 1));

        var review = await _db.WeeklyReviews.FirstOrDefaultAsync(w => w.UserId == userId && w.WeekStartDate == monday);
        return Ok(review);
    }

    [HttpGet("summary/{weekStart}")]
    public async Task<IActionResult> GetWeekSummary(string weekStart)
    {
        var userId = GetUserId();
        if (!DateTime.TryParse(weekStart, out var startDate)) return BadRequest();
        var endDate = startDate.AddDays(7);

        // Aggregate stats for the week
        var tasksCompleted = await _db.Tasks.CountAsync(t => t.UserId == userId && t.CompletedAt >= startDate && t.CompletedAt < endDate);
        var workoutDays = await _db.WorkoutDayPlans.CountAsync(p => p.UserId == userId && p.Date >= startDate && p.Date < endDate && p.IsCompleted);
        var studyMinutes = await _db.StudySessions.Where(s => s.UserId == userId && s.Date >= startDate && s.Date < endDate).SumAsync(s => (int?)s.DurationMinutes) ?? 0;
        var trackings = await _db.DailyTrackings.Where(t => t.UserId == userId && t.Date >= startDate && t.Date < endDate).ToListAsync();
        var moodAvg = trackings.Any() ? trackings.Average(t => (double)t.Mood) : 0;
        var expenses = await _db.Expenses.Where(e => e.UserId == userId && e.Date >= startDate && e.Date < endDate).SumAsync(e => (decimal?)e.Amount) ?? 0;

        return Ok(new
        {
            weekStart = startDate.ToString("yyyy-MM-dd"),
            tasksCompleted,
            workoutDays,
            studyHours = Math.Round(studyMinutes / 60.0, 1),
            moodAvg = Math.Round(moodAvg, 1),
            totalSpend = expenses
        });
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] WeeklyReview body)
    {
        var userId = GetUserId();
        body.UserId = userId;

        var existing = await _db.WeeklyReviews.FirstOrDefaultAsync(w => w.UserId == userId && w.WeekStartDate == body.WeekStartDate);
        if (existing is not null)
        {
            existing.Wins = body.Wins;
            existing.Improvements = body.Improvements;
            existing.NextWeekFocus = body.NextWeekFocus;
            existing.TasksCompleted = body.TasksCompleted;
            existing.WorkoutDays = body.WorkoutDays;
            existing.StudyHours = body.StudyHours;
            existing.MoodAvg = body.MoodAvg;
            existing.TotalSpend = body.TotalSpend;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        body.CreatedAt = DateTime.UtcNow;
        body.UpdatedAt = DateTime.UtcNow;
        _db.WeeklyReviews.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }
}
