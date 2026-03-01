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
    // returns self-care logs for a user
    public async Task<IActionResult> GetUserActivities(int userId)
    {
        try
        {
            var activities = await _db.SelfCareLogs
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.Date)
                .ToListAsync();
            return Ok(activities);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            // table missing, just return empty list to avoid breaking the client
            return Ok(Enumerable.Empty<SelfCareLog>());
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivity(int id)
    {
        try
        {
            var activity = await _db.SelfCareLogs.FindAsync(id);
            if (activity == null) return NotFound();
            return Ok(activity);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            return NotFound();
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity([FromBody] CreateSelfCareRequest req)
    {
        var activity = new SelfCareLog
        {
            UserId = req.UserId,
            Date = req.Date,
            TemplateId = req.TemplateId,
            Completed = req.Completed,
        };
        _db.SelfCareLogs.Add(activity);
        await _db.SaveChangesAsync();
        return Ok(activity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] UpdateSelfCareRequest req)
    {
        SelfCareLog? activity;
        try
        {
            activity = await _db.SelfCareLogs.FindAsync(id);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            return NotFound();
        }
        if (activity == null) return NotFound();
        
        activity.Date = req.Date ?? activity.Date;
        if (req.TemplateId.HasValue) activity.TemplateId = req.TemplateId.Value;
        if (req.Completed.HasValue) activity.Completed = req.Completed.Value;
        
        await _db.SaveChangesAsync();
        return Ok(activity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(int id)
    {
        try
        {
            var activity = await _db.SelfCareLogs.FindAsync(id);
            if (activity == null) return NotFound();
            _db.SelfCareLogs.Remove(activity);
            await _db.SaveChangesAsync();
            return Ok();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            return NotFound();
        }
    }
}

public record CreateSelfCareRequest(Guid UserId, DateTime Date, Guid TemplateId, bool Completed = false);
public record UpdateSelfCareRequest(DateTime? Date, Guid? TemplateId, bool? Completed);
