using GoodDaysApi.Data;
using GoodDaysApi.DTOs;
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

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        var entry = await _db.JournalEntries
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (entry is null) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JournalEntryDto dto)
    {
        var entry = new JournalEntry
        {
            UserId = GetUserId(),
            Date = dto.Date,
            Title = dto.Title,
            Body = dto.Body,
            MoodTag = dto.MoodTag,
            ImageUrl = dto.ImageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] JournalEntryDto dto)
    {
        var userId = GetUserId();
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (entry is null) return NotFound();
        entry.Title = dto.Title;
        entry.Body = dto.Body;
        entry.MoodTag = dto.MoodTag;
        entry.ImageUrl = dto.ImageUrl;
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
