using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudyController : ControllerBase
{
    private readonly AppDbContext _db;

    public StudyController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserSessions(Guid userId)
    {
        var sessions = await _db.StudySessions.Where(s => s.UserId == userId).OrderByDescending(s => s.Date).ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var session = await _db.StudySessions.FindAsync(id);
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreateStudyRequest req)
    {
        var session = new StudySession
        {
            UserId = req.UserId,
            DurationMinutes = req.DurationMinutes,
            Notes = req.Notes,
            Date = req.Date,
        };
        _db.StudySessions.Add(session);
        await _db.SaveChangesAsync();
        return Ok(session);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSession(Guid id, [FromBody] UpdateStudyRequest req)
    {
        var session = await _db.StudySessions.FindAsync(id);
        if (session == null) return NotFound();
        
        session.DurationMinutes = req.DurationMinutes ?? session.DurationMinutes;
        session.Notes = req.Notes ?? session.Notes;
        session.Date = req.Date ?? session.Date;
        
        await _db.SaveChangesAsync();
        return Ok(session);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var session = await _db.StudySessions.FindAsync(id);
        if (session == null) return NotFound();
        
        _db.StudySessions.Remove(session);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateStudyRequest(Guid UserId, int DurationMinutes, string? Notes, DateTime Date);
public record UpdateStudyRequest(int? DurationMinutes, string? Notes, DateTime? Date);
