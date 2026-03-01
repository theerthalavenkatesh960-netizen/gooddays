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
    public async Task<IActionResult> GetUserEntries(string userId)
    {
        // legacy shortcut API now hits same patients table; older clients will still
        // receive the smaller subset of fields they expect.
        if (!int.TryParse(userId, out var uid)) return BadRequest("invalid user id");
        var entries = await _db.ThesisPatients
            .Where(t => t.UserId == uid)
            .OrderByDescending(t => t.RecruitmentDate /* previously Date */)
            .ToListAsync();
        return Ok(entries);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEntry(int id)
    {
        var entry = await _db.ThesisPatients.FindAsync(id);
        if (entry == null) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry([FromBody] CreateThesisRequest req)
    {
        var entry = new ThesisPatient
        {
            UserId = req.UserId,
            GroupName = req.Title,
            Notes = req.Content,
            ProformaStatus = req.Status,
            RecruitmentDate = req.Date,
        };
        _db.ThesisPatients.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEntry(int id, [FromBody] UpdateThesisRequest req)
    {
        var entry = await _db.ThesisPatients.FindAsync(id);
        if (entry == null) return NotFound();

        entry.GroupName = req.Title ?? entry.GroupName;
        entry.Notes = req.Content ?? entry.Notes;
        entry.ProformaStatus = req.Status ?? entry.ProformaStatus;
        entry.RecruitmentDate = req.Date ?? entry.RecruitmentDate;

        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEntry(int id)
    {
        var entry = await _db.ThesisPatients.FindAsync(id);
        if (entry == null) return NotFound();

        _db.ThesisPatients.Remove(entry);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateThesisRequest(int UserId, string Title, string? Content, string? Status, DateTime Date);
public record UpdateThesisRequest(string? Title, string? Content, string? Status, DateTime? Date);
