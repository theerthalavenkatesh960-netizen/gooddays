using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly AppDbContext _db;
    public GoalsController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    private static string NormalizeGoalType(string? raw)
    {
        var value = (raw ?? string.Empty).Trim().ToLowerInvariant();
        return value is "milestone" ? "milestone" : "checklist";
    }

    private static DateTime? ParseNullableDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateOnly.TryParse(raw, out var dateOnly)) return null;
        return DateTime.SpecifyKind(dateOnly.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
    }

    private static string? ToDateOnlyIso(DateTime? value)
        => value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static bool IsDone(string? status)
        => string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase);

    private static object ToChecklistItemResponse(GoalChecklistItem i) => new
    {
        id = i.Id,
        goalId = i.GoalId,
        title = i.Title,
        isCompleted = i.IsCompleted,
        position = i.Position,
        completedAt = i.CompletedAt,
        createdAt = i.CreatedAt,
        updatedAt = i.UpdatedAt,
    };

    private static object ToGoalResponse(Goal goal, int checklistTotal, int checklistCompleted)
    {
        var isChecklist = string.Equals(goal.GoalType, "checklist", StringComparison.OrdinalIgnoreCase);
        decimal progressPercent;
        if (isChecklist)
        {
            progressPercent = checklistTotal == 0 ? 0 : Math.Round((decimal)checklistCompleted / checklistTotal * 100m, 2);
        }
        else
        {
            progressPercent = goal.TargetValue.HasValue && goal.TargetValue.Value > 0
                ? Math.Round(Math.Min(100m, (goal.CurrentValue / goal.TargetValue.Value) * 100m), 2)
                : 0;
        }

        int? daysRemaining = null;
        bool isOverdue = false;
        if (!IsDone(goal.Status) && goal.DeadlineDate.HasValue)
        {
            var delta = (goal.DeadlineDate.Value.Date - DateTime.UtcNow.Date).Days;
            daysRemaining = delta;
            isOverdue = delta < 0;
        }

        return new
        {
            id = goal.Id,
            userId = goal.UserId,
            title = goal.Title,
            category = goal.Category,
            color = goal.Color,
            icon = goal.Icon,
            targetDate = goal.TargetDate,
            goalType = goal.GoalType,
            targetValue = goal.TargetValue,
            currentValue = goal.CurrentValue,
            unit = goal.Unit,
            startDate = ToDateOnlyIso(goal.StartDate),
            deadlineDate = ToDateOnlyIso(goal.DeadlineDate),
            autoComplete = goal.AutoComplete,
            completedAt = goal.CompletedAt,
            status = goal.Status,
            createdAt = goal.CreatedAt,
            checklistTotal,
            checklistCompleted,
            progressPercent,
            daysRemaining,
            isOverdue,
        };
    }

    // ─── Goals ───────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var goals = await _db.Goals
            .Include(g => g.ChecklistItems)
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();
        return Ok(goals.Select(g => ToGoalResponse(g, g.ChecklistItems.Count, g.ChecklistItems.Count(i => i.IsCompleted))));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Title)) return BadRequest("Title is required");

        var goalType = NormalizeGoalType(body.GoalType);
        var startDate = ParseNullableDate(body.StartDate);
        var deadlineDate = ParseNullableDate(body.DeadlineDate) ?? ParseNullableDate(body.TargetDate);

        if (goalType == "milestone" && (!body.TargetValue.HasValue || body.TargetValue.Value <= 0))
            return BadRequest("Milestone goals require targetValue > 0");

        var goal = new Goal
        {
            UserId = GetUserId(),
            Title = body.Title.Trim(),
            Category = body.Category,
            Color = body.Color,
            Icon = body.Icon,
            TargetDate = deadlineDate,
            GoalType = goalType,
            TargetValue = goalType == "milestone" ? body.TargetValue : null,
            CurrentValue = body.CurrentValue ?? 0,
            Unit = body.Unit,
            StartDate = startDate,
            DeadlineDate = deadlineDate,
            AutoComplete = body.AutoComplete ?? true,
            Status = string.IsNullOrWhiteSpace(body.Status) ? "active" : body.Status!,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Goals.Add(goal);
        await _db.SaveChangesAsync();

        return Ok(ToGoalResponse(goal, 0, 0));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateGoalRequest body)
    {
        var userId = GetUserId();
        var goal = await _db.Goals.Include(g => g.ChecklistItems).FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
        if (goal is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(body.Title)) goal.Title = body.Title.Trim();
        if (body.Category is not null) goal.Category = body.Category;
        if (body.Color is not null) goal.Color = body.Color;
        if (body.Icon is not null) goal.Icon = body.Icon;

        if (body.GoalType is not null)
        {
            goal.GoalType = NormalizeGoalType(body.GoalType);
            if (goal.GoalType == "checklist") goal.TargetValue = null;
        }

        if (body.TargetValue.HasValue) goal.TargetValue = body.TargetValue;
        if (body.CurrentValue.HasValue) goal.CurrentValue = body.CurrentValue.Value;
        if (body.Unit is not null) goal.Unit = body.Unit;
        if (body.StartDate is not null) goal.StartDate = ParseNullableDate(body.StartDate);
        if (body.DeadlineDate is not null || body.TargetDate is not null)
        {
            goal.DeadlineDate = ParseNullableDate(body.DeadlineDate) ?? ParseNullableDate(body.TargetDate);
            goal.TargetDate = goal.DeadlineDate;
        }
        if (body.AutoComplete.HasValue) goal.AutoComplete = body.AutoComplete.Value;
        if (body.Status is not null) goal.Status = body.Status;

        if (IsDone(goal.Status) && goal.CompletedAt is null)
        {
            goal.CompletedAt = DateTime.UtcNow;
        }
        else if (!IsDone(goal.Status))
        {
            goal.CompletedAt = null;
        }

        await _db.SaveChangesAsync();
        return Ok(ToGoalResponse(goal, goal.ChecklistItems.Count, goal.ChecklistItems.Count(i => i.IsCompleted)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var goal = await _db.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
        if (goal is null) return NotFound();
        _db.Goals.Remove(goal);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{goalId}/progress")]
    public async Task<IActionResult> UpdateProgress(int goalId, [FromBody] UpdateGoalProgressRequest body)
    {
        var userId = GetUserId();
        var goal = await _db.Goals.Include(g => g.ChecklistItems).FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal is null) return NotFound();

        if (!string.Equals(goal.GoalType, "milestone", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Progress updates are only supported for milestone goals");

        if (body.AbsoluteValue.HasValue)
        {
            goal.CurrentValue = body.AbsoluteValue.Value;
        }
        else if (body.ValueDelta.HasValue)
        {
            goal.CurrentValue += body.ValueDelta.Value;
        }
        else
        {
            return BadRequest("Either absoluteValue or valueDelta is required");
        }

        if (goal.TargetValue.HasValue && goal.CurrentValue >= goal.TargetValue.Value)
        {
            goal.Status = "completed";
            goal.CompletedAt ??= DateTime.UtcNow;
        }

        if (body.Log is not null)
        {
            var logDate = ParseNullableDate(body.Log.Date) ?? DateTime.UtcNow;
            var log = await _db.GoalDailyLogs.FirstOrDefaultAsync(l => l.GoalId == goalId && l.Date.Date == logDate.Date);
            if (log is null)
            {
                log = new GoalDailyLog
                {
                    GoalId = goalId,
                    Date = logDate,
                    Content = body.Log.Content,
                    MinutesSpent = body.Log.MinutesSpent ?? 0,
                    ValueDelta = body.Log.ValueDelta,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.GoalDailyLogs.Add(log);
            }
            else
            {
                log.Content = body.Log.Content ?? log.Content;
                log.MinutesSpent = body.Log.MinutesSpent ?? log.MinutesSpent;
                log.ValueDelta = body.Log.ValueDelta ?? log.ValueDelta;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(ToGoalResponse(goal, goal.ChecklistItems.Count, goal.ChecklistItems.Count(i => i.IsCompleted)));
    }

    // ─── Notes ───────────────────────────────────────────────────────────

    [HttpGet("{goalId}/notes")]
    public async Task<IActionResult> GetNotes(int goalId)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        var notes = await _db.GoalNotes.Where(n => n.GoalId == goalId).OrderByDescending(n => n.UpdatedAt).ToListAsync();
        return Ok(notes);
    }

    [HttpPost("{goalId}/notes")]
    public async Task<IActionResult> CreateNote(int goalId, [FromBody] GoalNote body)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        body.GoalId = goalId;
        body.CreatedAt = DateTime.UtcNow;
        body.UpdatedAt = DateTime.UtcNow;
        _db.GoalNotes.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("notes/{id}")]
    public async Task<IActionResult> UpdateNote(int id, [FromBody] GoalNote body)
    {
        var userId = GetUserId();
        var note = await _db.GoalNotes.Include(n => n.Goal).FirstOrDefaultAsync(n => n.Id == id && n.Goal.UserId == userId);
        if (note is null) return NotFound();
        note.Title = body.Title;
        note.Content = body.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(note);
    }

    [HttpDelete("notes/{id}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        var userId = GetUserId();
        var note = await _db.GoalNotes.Include(n => n.Goal).FirstOrDefaultAsync(n => n.Id == id && n.Goal.UserId == userId);
        if (note is null) return NotFound();
        _db.GoalNotes.Remove(note);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Daily Logs ──────────────────────────────────────────────────────

    [HttpGet("{goalId}/logs")]
    public async Task<IActionResult> GetLogs(int goalId)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        var logs = await _db.GoalDailyLogs.Where(l => l.GoalId == goalId).OrderByDescending(l => l.Date).ToListAsync();
        return Ok(logs);
    }

    [HttpPost("{goalId}/logs")]
    public async Task<IActionResult> AddLog(int goalId, [FromBody] GoalDailyLog body)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        body.GoalId = goalId;
        body.CreatedAt = DateTime.UtcNow;
        _db.GoalDailyLogs.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("logs/{id}")]
    public async Task<IActionResult> UpdateLog(int id, [FromBody] GoalDailyLog body)
    {
        var userId = GetUserId();
        var log = await _db.GoalDailyLogs.Include(l => l.Goal).FirstOrDefaultAsync(l => l.Id == id && l.Goal.UserId == userId);
        if (log is null) return NotFound();
        log.Content = body.Content;
        log.MinutesSpent = body.MinutesSpent;
        await _db.SaveChangesAsync();
        return Ok(log);
    }

    [HttpDelete("logs/{id}")]
    public async Task<IActionResult> DeleteLog(int id)
    {
        var userId = GetUserId();
        var log = await _db.GoalDailyLogs
            .Include(l => l.Goal)
            .FirstOrDefaultAsync(l => l.Id == id && l.Goal.UserId == userId);
        if (log is null) return NotFound();

        _db.GoalDailyLogs.Remove(log);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Checklist ───────────────────────────────────────────────────────

    [HttpGet("{goalId}/checklist-items")]
    public async Task<IActionResult> GetChecklistItems(int goalId)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();

        var items = await _db.GoalChecklistItems
            .Where(i => i.GoalId == goalId)
            .OrderBy(i => i.Position)
            .ThenBy(i => i.Id)
            .ToListAsync();

        return Ok(items.Select(ToChecklistItemResponse));
    }

    [HttpPost("{goalId}/checklist-items")]
    public async Task<IActionResult> CreateChecklistItem(int goalId, [FromBody] CreateChecklistItemRequest body)
    {
        var userId = GetUserId();
        var goal = await _db.Goals.Include(g => g.ChecklistItems).FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal is null) return NotFound();
        if (string.IsNullOrWhiteSpace(body.Title)) return BadRequest("Title is required");

        var item = new GoalChecklistItem
        {
            GoalId = goalId,
            Title = body.Title.Trim(),
            IsCompleted = false,
            Position = body.Position ?? (goal.ChecklistItems.Count == 0 ? 1 : goal.ChecklistItems.Max(i => i.Position) + 1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.GoalChecklistItems.Add(item);
        await _db.SaveChangesAsync();

        return Ok(ToChecklistItemResponse(item));
    }

    [HttpPut("checklist-items/{id}")]
    public async Task<IActionResult> UpdateChecklistItem(int id, [FromBody] UpdateChecklistItemRequest body)
    {
        var userId = GetUserId();
        var item = await _db.GoalChecklistItems
            .Include(i => i.Goal)
            .FirstOrDefaultAsync(i => i.Id == id && i.Goal.UserId == userId);
        if (item is null) return NotFound();

        if (body.Title is not null) item.Title = body.Title.Trim();
        if (body.Position.HasValue) item.Position = body.Position.Value;
        if (body.IsCompleted.HasValue)
        {
            item.IsCompleted = body.IsCompleted.Value;
            item.CompletedAt = item.IsCompleted ? DateTime.UtcNow : null;
        }
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await SyncChecklistCompletion(item.GoalId, userId);

        return Ok(ToChecklistItemResponse(item));
    }

    [HttpDelete("checklist-items/{id}")]
    public async Task<IActionResult> DeleteChecklistItem(int id)
    {
        var userId = GetUserId();
        var item = await _db.GoalChecklistItems
            .Include(i => i.Goal)
            .FirstOrDefaultAsync(i => i.Id == id && i.Goal.UserId == userId);
        if (item is null) return NotFound();

        var goalId = item.GoalId;
        _db.GoalChecklistItems.Remove(item);
        await _db.SaveChangesAsync();
        await SyncChecklistCompletion(goalId, userId);

        return Ok();
    }

    private async Task SyncChecklistCompletion(int goalId, int userId)
    {
        var goal = await _db.Goals.Include(g => g.ChecklistItems).FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal is null) return;
        if (!string.Equals(goal.GoalType, "checklist", StringComparison.OrdinalIgnoreCase)) return;

        var total = goal.ChecklistItems.Count;
        var completed = goal.ChecklistItems.Count(i => i.IsCompleted);
        if (goal.AutoComplete && total > 0 && completed == total)
        {
            goal.Status = "completed";
            goal.CompletedAt ??= DateTime.UtcNow;
        }
        else if (goal.Status == "completed" && completed < total)
        {
            goal.Status = "active";
            goal.CompletedAt = null;
        }

        await _db.SaveChangesAsync();
    }

    // ─── Flashcards ──────────────────────────────────────────────────────

    [HttpGet("{goalId}/flashcards")]
    public async Task<IActionResult> GetFlashcards(int goalId)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        var cards = await _db.Flashcards.Where(f => f.GoalId == goalId).OrderBy(f => f.Topic).ThenBy(f => f.CreatedAt).ToListAsync();
        return Ok(cards);
    }

    [HttpGet("{goalId}/flashcards/review")]
    public async Task<IActionResult> GetReviewQueue(int goalId)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        var now = DateTime.UtcNow;
        // Return cards due for review: new cards + cards where NextReview <= now, prioritized by confidence (lowest first)
        var cards = await _db.Flashcards
            .Where(f => f.GoalId == goalId && (f.NextReview == null || f.NextReview <= now))
            .OrderBy(f => f.ConfidenceLevel)
            .ThenBy(f => f.LastReviewed)
            .ToListAsync();
        return Ok(cards);
    }

    [HttpPost("{goalId}/flashcards")]
    public async Task<IActionResult> CreateFlashcard(int goalId, [FromBody] Flashcard body)
    {
        var userId = GetUserId();
        if (!await _db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == userId)) return NotFound();
        body.GoalId = goalId;
        body.CreatedAt = DateTime.UtcNow;
        _db.Flashcards.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("flashcards/{id}")]
    public async Task<IActionResult> UpdateFlashcard(int id, [FromBody] Flashcard body)
    {
        var userId = GetUserId();
        var card = await _db.Flashcards.Include(f => f.Goal).FirstOrDefaultAsync(f => f.Id == id && f.Goal.UserId == userId);
        if (card is null) return NotFound();
        card.Topic = body.Topic;
        card.Front = body.Front;
        card.Back = body.Back;
        card.ConfidenceLevel = body.ConfidenceLevel;
        card.LastReviewed = DateTime.UtcNow;
        // Spaced repetition: next review interval based on confidence
        card.NextReview = body.ConfidenceLevel switch
        {
            0 => DateTime.UtcNow.AddDays(1),    // New/Hard → review tomorrow
            1 => DateTime.UtcNow.AddDays(1),
            2 => DateTime.UtcNow.AddDays(3),    // Medium → 3 days
            3 => DateTime.UtcNow.AddDays(7),    // Good → 1 week
            4 => DateTime.UtcNow.AddDays(14),   // Easy → 2 weeks
            5 => DateTime.UtcNow.AddDays(30),   // Mastered → 1 month
            _ => DateTime.UtcNow.AddDays(3)
        };
        await _db.SaveChangesAsync();
        return Ok(card);
    }

    [HttpDelete("flashcards/{id}")]
    public async Task<IActionResult> DeleteFlashcard(int id)
    {
        var userId = GetUserId();
        var card = await _db.Flashcards.Include(f => f.Goal).FirstOrDefaultAsync(f => f.Id == id && f.Goal.UserId == userId);
        if (card is null) return NotFound();
        _db.Flashcards.Remove(card);
        await _db.SaveChangesAsync();
        return Ok();
    }

    public record CreateGoalRequest(
        string Title,
        string? Category,
        string? Color,
        string? Icon,
        string? GoalType,
        decimal? TargetValue,
        decimal? CurrentValue,
        string? Unit,
        string? StartDate,
        string? TargetDate,
        string? DeadlineDate,
        bool? AutoComplete,
        string? Status);

    public record UpdateGoalRequest(
        string? Title,
        string? Category,
        string? Color,
        string? Icon,
        string? GoalType,
        decimal? TargetValue,
        decimal? CurrentValue,
        string? Unit,
        string? StartDate,
        string? TargetDate,
        string? DeadlineDate,
        bool? AutoComplete,
        string? Status);

    public record CreateChecklistItemRequest(string Title, int? Position);

    public record UpdateChecklistItemRequest(string? Title, bool? IsCompleted, int? Position);

    public record UpdateGoalProgressRequest(decimal? AbsoluteValue, decimal? ValueDelta, GoalProgressLogInput? Log);

    public record GoalProgressLogInput(string? Date, string? Content, int? MinutesSpent, decimal? ValueDelta);
}
