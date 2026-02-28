using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly AppDbContext _db;

    public GamificationController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserGamification(Guid userId)
    {
        var entries = await _db.GamificationEntries.Where(g => g.UserId == userId).OrderByDescending(g => g.Date).ToListAsync();
        var totalPoints = entries.Sum(e => e.Points);
        return Ok(new { entries, totalPoints });
    }

    [HttpGet("points/{userId}")]
    public async Task<IActionResult> GetUserPoints(Guid userId)
    {
        var totalPoints = await _db.GamificationEntries.Where(g => g.UserId == userId).SumAsync(g => g.Points);
        return Ok(new { totalPoints });
    }

    [HttpPost]
    public async Task<IActionResult> AddPoints([FromBody] AddPointsRequest req)
    {
        var entry = new GamificationEntry
        {
            UserId = req.UserId,
            ActivityType = req.ActivityType,
            Points = req.Points,
            Date = DateTime.UtcNow,
        };
        _db.GamificationEntries.Add(entry);
        await _db.SaveChangesAsync();
        
        var totalPoints = await _db.GamificationEntries.Where(g => g.UserId == req.UserId).SumAsync(g => g.Points);
        return Ok(new { entry, totalPoints });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        var entry = await _db.GamificationEntries.FindAsync(id);
        if (entry == null) return NotFound();
        
        _db.GamificationEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record AddPointsRequest(Guid UserId, string ActivityType, int Points);
