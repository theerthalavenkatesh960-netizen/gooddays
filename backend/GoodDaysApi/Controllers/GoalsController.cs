using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly AppDbContext _db;
    public GoalsController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(User.FindFirst("userId")!.Value);

    // ─── Goals ───────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var goals = await _db.Goals
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();
        return Ok(goals);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Goal body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.Goals.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Goal body)
    {
        var userId = GetUserId();
        var goal = await _db.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
        if (goal is null) return NotFound();
        goal.Title = body.Title;
        goal.Category = body.Category;
        goal.Color = body.Color;
        goal.Icon = body.Icon;
        goal.TargetDate = body.TargetDate;
        goal.Status = body.Status;
        await _db.SaveChangesAsync();
        return Ok(goal);
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
}
