using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeeklyReviewsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _http;

    public WeeklyReviewsController(AppDbContext db, IConfiguration config, IHttpClientFactory http)
    {
        _db = db;
        _config = config;
        _http = http;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

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
            existing.Reflection = body.Reflection;
            existing.TasksCompleted = body.TasksCompleted;
            existing.WorkoutDays = body.WorkoutDays;
            existing.StudyHours = body.StudyHours;
            existing.MoodAvg = body.MoodAvg;
            existing.TotalSpend = body.TotalSpend;
            if (body.AiSummary != null)        existing.AiSummary = body.AiSummary;
            if (body.AiPatternNoticed != null) existing.AiPatternNoticed = body.AiPatternNoticed;
            if (body.AiNextFocus != null)      existing.AiNextFocus = body.AiNextFocus;
            if (body.AiGenerated)              existing.AiGenerated = true;
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

    // ── AI Generation ─────────────────────────────────────────────────────────
    // POST /api/weeklyreviews/generate?weekStart=2026-05-01
    // Fetches week data, calls Claude API, upserts the review with AI fields.
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromQuery] string? weekStart)
    {
        var userId = GetUserId();

        // Resolve week start date (Monday)
        DateTime startDate;
        if (string.IsNullOrEmpty(weekStart) || !DateTime.TryParse(weekStart, out startDate))
        {
            var today = DateTime.UtcNow.Date;
            var dow = (int)today.DayOfWeek;
            startDate = today.AddDays(dow == 0 ? -6 : -(dow - 1));
        }
        var endDate = startDate.AddDays(7);

        // Gather all week data
        var tasksCompleted = await _db.Tasks
            .CountAsync(t => t.UserId == userId && t.CompletedAt >= startDate && t.CompletedAt < endDate);
        var totalTasks = await _db.Tasks
            .CountAsync(t => t.UserId == userId && t.CreatedAt >= startDate && t.CreatedAt < endDate);
        var workoutDays = await _db.WorkoutDayPlans
            .CountAsync(p => p.UserId == userId && p.Date >= startDate && p.Date < endDate && p.IsCompleted);
        var studyMinutes = await _db.StudySessions
            .Where(s => s.UserId == userId && s.Date >= startDate && s.Date < endDate)
            .SumAsync(s => (int?)s.DurationMinutes) ?? 0;
        var trackings = await _db.DailyTrackings
            .Where(t => t.UserId == userId && t.Date >= startDate && t.Date < endDate)
            .ToListAsync();
        var moodAvg = trackings.Any() ? Math.Round(trackings.Average(t => (double)t.Mood), 1) : 0;
        var avgSleep = trackings.Any() ? Math.Round((double)trackings.Average(t => t.SleepHours), 1) : 0;
        var totalSpend = await _db.Expenses
            .Where(e => e.UserId == userId && e.Date >= startDate && e.Date < endDate)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;
        var journalEntries = await _db.JournalEntries
            .Where(j => j.UserId == userId && j.CreatedAt >= startDate && j.CreatedAt < endDate)
            .Select(j => j.Title)
            .ToListAsync();

        // Build Claude prompt
        var prompt = $"""
You are a personal life coach AI. Analyse this person's week and write a concise, warm, insightful weekly review.

Week: {startDate:d MMM} – {endDate.AddDays(-1):d MMM yyyy}

Data:
- Tasks: {tasksCompleted}/{totalTasks} completed
- Workout days: {workoutDays}/7
- Study: {Math.Round(studyMinutes / 60.0, 1)}h
- Avg sleep: {avgSleep}h
- Avg mood: {moodAvg}/5
- Total spend: ₹{totalSpend}
- Journal entries: {journalEntries.Count} ({string.Join(", ", journalEntries.Take(3))})

Reply in this exact JSON format (no markdown):
{{
  "summary": "2-3 sentence warm summary of the week",
  "patternNoticed": "1 insightful pattern you spotted in the data",
  "nextFocus": "1 specific, actionable focus for next week"
}}
""";

        var apiKey = _config["Anthropic:ApiKey"] ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        if (string.IsNullOrEmpty(apiKey))
            return StatusCode(503, new { error = "AI not configured. Set ANTHROPIC_API_KEY." });

        try
        {
            var client = _http.CreateClient();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var requestBody = new
            {
                model = "claude-haiku-4-5",
                max_tokens = 512,
                messages = new[] { new { role = "user", content = prompt } }
            };

            var response = await client.PostAsync(
                "https://api.anthropic.com/v1/messages",
                new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            );

            var responseText = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode(502, new { error = "Claude API error", detail = responseText });

            using var doc = JsonDocument.Parse(responseText);
            var content = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            using var aiDoc = JsonDocument.Parse(content);
            var aiSummary       = aiDoc.RootElement.TryGetProperty("summary",        out var s) ? s.GetString() : null;
            var aiPattern       = aiDoc.RootElement.TryGetProperty("patternNoticed", out var p) ? p.GetString() : null;
            var aiNextFocus     = aiDoc.RootElement.TryGetProperty("nextFocus",      out var n) ? n.GetString() : null;

            // Upsert review
            var existing = await _db.WeeklyReviews
                .FirstOrDefaultAsync(w => w.UserId == userId && w.WeekStartDate == startDate);

            if (existing is null)
            {
                existing = new WeeklyReview
                {
                    UserId = userId,
                    WeekStartDate = startDate,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.WeeklyReviews.Add(existing);
            }

            existing.TasksCompleted = tasksCompleted;
            existing.WorkoutDays = workoutDays;
            existing.StudyHours = (decimal)Math.Round(studyMinutes / 60.0, 1);
            existing.MoodAvg = (decimal)moodAvg;
            existing.TotalSpend = totalSpend;
            existing.AiSummary = aiSummary;
            existing.AiPatternNoticed = aiPattern;
            existing.AiNextFocus = aiNextFocus;
            existing.AiGenerated = true;
            existing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
