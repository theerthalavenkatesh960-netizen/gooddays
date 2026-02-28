using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SelfCareController : ControllerBase
{
    private readonly AppDbContext _db;

    public SelfCareController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserActivities(Guid userId)
    {
        var activities = await _db.SelfCareActivities.Where(s => s.UserId == userId).OrderByDescending(s => s.Date).ToListAsync();
        return Ok(activities);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivity(Guid id)
    {
        var activity = await _db.SelfCareActivities.FindAsync(id);
        if (activity == null) return NotFound();
        return Ok(activity);
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity([FromBody] CreateSelfCareRequest req)
    {
        var activity = new SelfCareActivity
        {
            UserId = req.UserId,
            ActivityType = req.ActivityType,
            Description = req.Description,
            DurationMinutes = req.DurationMinutes,
            Date = req.Date,
        };
        _db.SelfCareActivities.Add(activity);
        await _db.SaveChangesAsync();
        return Ok(activity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] UpdateSelfCareRequest req)
    {
        var activity = await _db.SelfCareActivities.FindAsync(id);
        if (activity == null) return NotFound();
        
        activity.ActivityType = req.ActivityType ?? activity.ActivityType;
        activity.Description = req.Description ?? activity.Description;
        activity.DurationMinutes = req.DurationMinutes ?? activity.DurationMinutes;
        activity.Date = req.Date ?? activity.Date;
        
        await _db.SaveChangesAsync();
        return Ok(activity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(Guid id)
    {
        var activity = await _db.SelfCareActivities.FindAsync(id);
        if (activity == null) return NotFound();
        
        _db.SelfCareActivities.Remove(activity);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateSelfCareRequest(Guid UserId, string ActivityType, string Description, int DurationMinutes, DateTime Date);
public record UpdateSelfCareRequest(string? ActivityType, string? Description, int? DurationMinutes, DateTime? Date);
