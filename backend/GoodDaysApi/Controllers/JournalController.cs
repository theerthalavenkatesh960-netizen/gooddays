using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JournalController : ControllerBase
{
    private readonly AppDbContext _db;
    public JournalController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(User.FindFirst("userId")!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var entries = await _db.JournalEntries
            .Where(j => j.UserId == userId)
            .OrderByDescending(j => j.Date)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return Ok(entries);
    }

    [HttpGet("memory-wall")]
    public async Task<IActionResult> GetMemoryWall()
    {
        var userId = GetUserId();
        var entries = await _db.JournalEntries
            .Where(j => j.UserId == userId && j.ImageUrl != null)
            .OrderByDescending(j => j.Date)
            .ToListAsync();
        return Ok(entries);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JournalEntry body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        body.UpdatedAt = DateTime.UtcNow;
        _db.JournalEntries.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] JournalEntry body)
    {
        var userId = GetUserId();
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (entry is null) return NotFound();
        entry.Title = body.Title;
        entry.Body = body.Body;
        entry.MoodTag = body.MoodTag;
        entry.ImageUrl = body.ImageUrl;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (entry is null) return NotFound();
        _db.JournalEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
