using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services;
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
    private readonly WeeklyGoalAdjustmentService _weeklyGoalAdjustment;

    public WeeklyReviewsController(
        AppDbContext db,
        IConfiguration config,
        IHttpClientFactory http,
        WeeklyGoalAdjustmentService weeklyGoalAdjustment)
    {
        _db = db;
        _config = config;
        _http = http;
        _weeklyGoalAdjustment = weeklyGoalAdjustment;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // Parsed dates are Kind=Unspecified, which Npgsql refuses to compare against timestamptz columns.
    private static bool TryParseUtcDate(string? value, out DateTime parsed)
    {
        if (DateTime.TryParse(value, out var raw))
        {
            parsed = raw.Kind == DateTimeKind.Utc ? raw : DateTime.SpecifyKind(raw, DateTimeKind.Utc);
            return true;
        }

        parsed = default;
        return false;
    }

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
        if (!TryParseUtcDate(weekStart, out var startDate)) return BadRequest();
        var endDate = startDate.AddDays(7);

        // Aggregate stats for the week
        var tasksCompleted = await _db.Tasks.CountAsync(t => t.UserId == userId && t.CompletedAt >= startDate && t.CompletedAt < endDate);
        var workoutDays = await _db.WorkoutDayPlans.CountAsync(p => p.UserId == userId && p.Date >= startDate && p.Date < endDate && p.IsCompleted);
        var studyMinutes = 0;
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

    // ── Weekly Recommendations (recommend-only) ─────────────────────────────
    // POST /api/weeklyreviews/recommendations/generate?weekStart=2026-05-01
    [HttpPost("recommendations/generate")]
    public async Task<IActionResult> GenerateRecommendations([FromBody] WeeklyRecommendationGenerateRequest? body)
    {
        var userId = GetUserId();

        DateTime startDate;
        if (body is null || string.IsNullOrWhiteSpace(body.WeekStart) || !TryParseUtcDate(body.WeekStart, out startDate))
        {
            var today = DateTime.UtcNow.Date;
            var dow = (int)today.DayOfWeek;
            startDate = today.AddDays(dow == 0 ? -6 : -(dow - 1));
        }

        var result = await _weeklyGoalAdjustment.GenerateAsync(userId, startDate, body);

        // Persist snapshot (pending until user decides)
        var targetWeekStart = TryParseUtcDate(result.TargetWeekStart, out var tws) ? tws : startDate.AddDays(7);
        var snapshot = new WeeklyRecommendationSnapshot
        {
            UserId = userId,
            WeekStart = startDate,
            TargetWeekStart = targetWeekStart,
            Status = "pending",
            SnapshotJson = JsonSerializer.Serialize(result),
            GeneratedAt = DateTime.UtcNow,
        };
        _db.WeeklyRecommendationSnapshots.Add(snapshot);
        await _db.SaveChangesAsync();

        return Ok(new { snapshotId = snapshot.Id, result });
    }

    // GET /api/weeklyreviews/recommendations/snapshots
    [HttpGet("recommendations/snapshots")]
    public async Task<IActionResult> GetSnapshots()
    {
        var userId = GetUserId();
        var snapshots = await _db.WeeklyRecommendationSnapshots
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.GeneratedAt)
            .Take(20)
            .Select(s => new
            {
                s.Id,
                weekStart = s.WeekStart.ToString("yyyy-MM-dd"),
                targetWeekStart = s.TargetWeekStart.ToString("yyyy-MM-dd"),
                s.Status,
                s.GeneratedAt,
                s.DecidedAt,
            })
            .ToListAsync();
        return Ok(snapshots);
    }

    // POST /api/weeklyreviews/recommendations/snapshots/{id}/decide
    [HttpPost("recommendations/snapshots/{id:int}/decide")]
    public async Task<IActionResult> DecideSnapshot(int id, [FromBody] DecideSnapshotRequest req)
    {
        var userId = GetUserId();
        var snapshot = await _db.WeeklyRecommendationSnapshots
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (snapshot is null) return NotFound();

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "approved", "dismissed", "partial" };
        if (!allowed.Contains(req.Status)) return BadRequest("Status must be approved, dismissed, or partial.");

        snapshot.Status = req.Status.ToLowerInvariant();
        snapshot.DecidedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { snapshot.Id, snapshot.Status, snapshot.DecidedAt });
    }

    // POST /api/weeklyreviews/recommendations/apply
    // Apply user-edited suggested meal/workout plans for a target week.
    [HttpPost("recommendations/apply")]
    public async Task<IActionResult> ApplyRecommendations([FromBody] ApplyWeeklyRecommendationsRequest body)
    {
        var userId = GetUserId();
        var targetWeekStart = DateOnly.TryParse(body.TargetWeekStart, out var parsedStart)
            ? parsedStart
            : DateOnly.FromDateTime(DateTime.UtcNow.Date);

        if ((body.MealPlan is null || body.MealPlan.Count == 0)
            && (body.WorkoutRoutine is null || body.WorkoutRoutine.Count == 0))
        {
            return BadRequest("No plan updates provided. Pass mealPlan and/or workoutRoutine.");
        }

        if (body.MealPlan is not null && body.MealPlan.Count > 0)
        {
            await ApplyMealPlanAsync(userId, body.MealPlan, targetWeekStart);
        }

        if (body.WorkoutRoutine is not null && body.WorkoutRoutine.Count > 0)
        {
            await ApplyWorkoutRoutineAsync(userId, body.WorkoutRoutine, body.WorkoutSplitName);
        }

        await _db.SaveChangesAsync();

        // Mark the most recent pending snapshot for this target week as approved/partial
        var targetDt = DateTime.SpecifyKind(targetWeekStart.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var pendingSnapshot = await _db.WeeklyRecommendationSnapshots
            .Where(s => s.UserId == userId && s.TargetWeekStart.Date == targetDt.Date && s.Status == "pending")
            .OrderByDescending(s => s.GeneratedAt)
            .FirstOrDefaultAsync();
        if (pendingSnapshot is not null)
        {
            bool bothApplied = body.MealPlan?.Count > 0 && body.WorkoutRoutine?.Count > 0;
            pendingSnapshot.Status = bothApplied ? "approved" : "partial";
            pendingSnapshot.DecidedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            applied = true,
            targetWeekStart = targetWeekStart.ToString("yyyy-MM-dd"),
            mealUpdated = body.MealPlan is not null && body.MealPlan.Count > 0,
            workoutUpdated = body.WorkoutRoutine is not null && body.WorkoutRoutine.Count > 0,
        });
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
        if (string.IsNullOrEmpty(weekStart) || !TryParseUtcDate(weekStart, out startDate))
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
        var studyMinutes = 0;
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

Reply with strict JSON only (no markdown). Use exactly these keys:
- summary: 2-3 sentence warm summary of the week
- patternNoticed: 1 insightful pattern spotted in the data
- nextFocus: 1 specific actionable focus for next week
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

    private async Task ApplyMealPlanAsync(int userId, Dictionary<string, List<MealSuggestion>> mealPlan, DateOnly targetWeekStart)
    {
        var plan = await _db.WeeklyMealPlans.FirstOrDefaultAsync(p => p.UserId == userId);
        if (plan is null)
        {
            plan = new WeeklyMealPlan { UserId = userId, PlanJson = "{}", UpdatedAt = DateTime.UtcNow };
            _db.WeeklyMealPlans.Add(plan);
        }

        Dictionary<string, List<object>> merged;
        try
        {
            merged = ParseMealPlanForMerge(plan.PlanJson);
        }
        catch
        {
            merged = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
        }

        for (var i = 0; i < 7; i++)
        {
            var date = targetWeekStart.AddDays(i);
            var dateKey = date.ToString("yyyy-MM-dd");
            merged.Remove(dateKey);
        }

        foreach (var kv in mealPlan)
        {
            var key = NormalizeDateKey(kv.Key, targetWeekStart);
            if (string.IsNullOrWhiteSpace(key)) continue;

            var items = (kv.Value ?? new List<MealSuggestion>())
                .Where(m => m.MealTemplateId > 0)
                .DistinctBy(m => m.MealTemplateId)
                .Select(m => (object)new { mealTemplateId = m.MealTemplateId, timeOfDay = m.TimeOfDay })
                .ToList();
            merged[key] = items;
        }

        plan.PlanJson = JsonSerializer.Serialize(merged);
        plan.UpdatedAt = DateTime.UtcNow;
    }

    private async Task ApplyWorkoutRoutineAsync(
        int userId,
        Dictionary<string, List<WorkoutSuggestion>> workoutRoutine,
        string? workoutSplitName)
    {
        var split = await _db.WorkoutSplitPresets
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.IsActive)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (split is null)
        {
            split = new WorkoutSplitPreset
            {
                UserId = userId,
                Name = string.IsNullOrWhiteSpace(workoutSplitName) ? "Adaptive Weekly Split" : workoutSplitName.Trim(),
                DayConfigs = "{}",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            _db.WorkoutSplitPresets.Add(split);
        }

        var normalized = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
        var allowedDays = new HashSet<string>(new[] { "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" });
        foreach (var day in allowedDays)
        {
            var entries = workoutRoutine.TryGetValue(day, out var source)
                ? source
                : new List<WorkoutSuggestion>();

            normalized[day] = entries
                .Where(e => e.ExerciseId > 0)
                .Select(e => (object)new
                {
                    exerciseId = e.ExerciseId,
                    sets = Math.Max(1, e.Sets <= 0 ? 3 : e.Sets),
                    reps = Math.Max(1, e.Reps <= 0 ? 10 : e.Reps),
                })
                .ToList();
        }

        split.Name = string.IsNullOrWhiteSpace(workoutSplitName) ? split.Name : workoutSplitName.Trim();
        split.DayConfigs = JsonSerializer.Serialize(normalized);
        split.IsActive = true;

        var others = await _db.WorkoutSplitPresets.Where(s => s.UserId == userId && s.Id != split.Id).ToListAsync();
        foreach (var other in others)
        {
            other.IsActive = false;
        }
    }

    private static string NormalizeDateKey(string rawKey, DateOnly targetWeekStart)
    {
        if (DateOnly.TryParse(rawKey, out var date))
        {
            return date.ToString("yyyy-MM-dd");
        }

        var day = rawKey.Trim().ToLowerInvariant();
        var dayMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["monday"] = 0,
            ["tuesday"] = 1,
            ["wednesday"] = 2,
            ["thursday"] = 3,
            ["friday"] = 4,
            ["saturday"] = 5,
            ["sunday"] = 6,
        };

        if (!dayMap.TryGetValue(day, out var offset)) return string.Empty;
        return targetWeekStart.AddDays(offset).ToString("yyyy-MM-dd");
    }

    private static Dictionary<string, List<object>> ParseMealPlanForMerge(string? json)
    {
        var result = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(json)) return result;

        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.ValueKind != JsonValueKind.Object) return result;

        foreach (var day in doc.RootElement.EnumerateObject())
        {
            var rows = new List<object>();
            if (day.Value.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in day.Value.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var id) && id > 0)
                    {
                        rows.Add(new { mealTemplateId = id, timeOfDay = (string?)null });
                        continue;
                    }

                    if (item.ValueKind != JsonValueKind.Object) continue;
                    if (!TryReadMealTemplateId(item, out var mealId) || mealId <= 0) continue;
                    var time = TryReadTimeOfDay(item);
                    rows.Add(new { mealTemplateId = mealId, timeOfDay = time });
                }
            }

            result[day.Name] = rows;
        }

        return result;
    }

    private static bool TryReadMealTemplateId(JsonElement item, out int mealId)
    {
        mealId = 0;
        foreach (var prop in item.EnumerateObject())
        {
            var name = prop.Name.ToLowerInvariant();
            if (name is not ("mealtemplateid" or "meal_template_id")) continue;
            if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetInt32(out mealId)) return true;
            if (prop.Value.ValueKind == JsonValueKind.String && int.TryParse(prop.Value.GetString(), out mealId)) return true;
        }

        return false;
    }

    private static string? TryReadTimeOfDay(JsonElement item)
    {
        foreach (var prop in item.EnumerateObject())
        {
            var name = prop.Name.ToLowerInvariant();
            if (name is not ("timeofday" or "time_of_day")) continue;
            return prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : null;
        }

        return null;
    }
}

public class ApplyWeeklyRecommendationsRequest
{
    public string? TargetWeekStart { get; set; }
    public Dictionary<string, List<MealSuggestion>>? MealPlan { get; set; }
    public Dictionary<string, List<WorkoutSuggestion>>? WorkoutRoutine { get; set; }
    public string? WorkoutSplitName { get; set; }
}

public record DecideSnapshotRequest(string Status);
