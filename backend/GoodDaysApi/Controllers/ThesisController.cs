using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ThesisController : ControllerBase
{
    private readonly AppDbContext _db;

    public ThesisController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserEntries(Guid userId)
    {
        var entries = await _db.ThesisEntries.Where(t => t.UserId == userId).OrderByDescending(t => t.Date).ToListAsync();
        return Ok(entries);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEntry(Guid id)
    {
        var entry = await _db.ThesisEntries.FindAsync(id);
        if (entry == null) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry([FromBody] CreateThesisRequest req)
    {
        var entry = new ThesisEntry
        {
            UserId = req.UserId,
            Title = req.Title,
            Content = req.Content,
            Status = req.Status,
            Date = req.Date,
        };
        _db.ThesisEntries.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] UpdateThesisRequest req)
    {
        var entry = await _db.ThesisEntries.FindAsync(id);
        if (entry == null) return NotFound();
        
        entry.Title = req.Title ?? entry.Title;
        entry.Content = req.Content ?? entry.Content;
        entry.Status = req.Status ?? entry.Status;
        entry.Date = req.Date ?? entry.Date;
        
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        var entry = await _db.ThesisEntries.FindAsync(id);
        if (entry == null) return NotFound();
        
        _db.ThesisEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateThesisRequest(Guid UserId, string Title, string? Content, string? Status, DateTime Date);
public record UpdateThesisRequest(string? Title, string? Content, string? Status, DateTime? Date);
