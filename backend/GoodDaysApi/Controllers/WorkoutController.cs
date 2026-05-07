using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkoutController : ControllerBase
{
    private readonly AppDbContext _db;
    public WorkoutController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Split Presets ───────────────────────────────────────────────────

    [HttpGet("splits")]
    public async Task<IActionResult> GetSplits()
    {
        var userId = GetUserId();
        return Ok(await _db.WorkoutSplitPresets.Where(s => s.UserId == userId).ToListAsync());
    }

    [HttpPost("splits")]
    public async Task<IActionResult> CreateSplit([FromBody] WorkoutSplitPreset body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.WorkoutSplitPresets.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("splits/{id}")]
    public async Task<IActionResult> UpdateSplit(int id, [FromBody] WorkoutSplitPreset body)
    {
        var userId = GetUserId();
        var split = await _db.WorkoutSplitPresets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (split is null) return NotFound();
        split.Name = body.Name;
        split.DayConfigs = body.DayConfigs;
        split.IsActive = body.IsActive;

        // Ensure only one split is active
        if (body.IsActive)
        {
            var others = await _db.WorkoutSplitPresets.Where(s => s.UserId == userId && s.Id != id).ToListAsync();
            others.ForEach(s => s.IsActive = false);
        }
        await _db.SaveChangesAsync();
        return Ok(split);
    }

    [HttpDelete("splits/{id}")]
    public async Task<IActionResult> DeleteSplit(int id)
    {
        var userId = GetUserId();
        var split = await _db.WorkoutSplitPresets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (split is null) return NotFound();
        _db.WorkoutSplitPresets.Remove(split);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Day Plans ───────────────────────────────────────────────────────

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans([FromQuery] string? from, [FromQuery] string? to)
    {
        var userId = GetUserId();
        var query = _db.WorkoutDayPlans
            .Include(p => p.Sets)
            .Include(p => p.Images)
            .Where(p => p.UserId == userId);

        if (DateTime.TryParse(from, out var fromDate)) query = query.Where(p => p.Date >= fromDate);
        if (DateTime.TryParse(to, out var toDate)) query = query.Where(p => p.Date <= toDate);

        return Ok(await query.OrderByDescending(p => p.Date).ToListAsync());
    }

    [HttpGet("plans/{id}")]
    public async Task<IActionResult> GetPlan(int id)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans
            .Include(p => p.Sets)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        return plan is null ? NotFound() : Ok(plan);
    }

    [HttpGet("plans/date/{date}")]
    public async Task<IActionResult> GetPlanByDate(string date)
    {
        var userId = GetUserId();
        if (!DateTime.TryParse(date, out var parsedDate)) return BadRequest("Invalid date");
        var plan = await _db.WorkoutDayPlans
            .Include(p => p.Sets)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Date.Date == parsedDate.Date);
        return Ok(plan); // can be null — frontend handles "no plan yet" state
    }

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] WorkoutDayPlan body)
    {
        body.UserId = GetUserId();
        body.CreatedAt = DateTime.UtcNow;
        _db.WorkoutDayPlans.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("plans/{id}")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] WorkoutDayPlan body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (plan is null) return NotFound();
        plan.DayLabel = body.DayLabel;
        plan.PlannedExercises = body.PlannedExercises;
        plan.IsCompleted = body.IsCompleted;
        plan.Notes = body.Notes;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    // ─── Workout Sets (logging) ──────────────────────────────────────────

    [HttpGet("plans/{planId}/sets")]
    public async Task<IActionResult> GetSets(int planId)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId);
        if (plan is null) return NotFound();
        var sets = await _db.WorkoutSets.Where(s => s.WorkoutDayPlanId == planId).OrderBy(s => s.ExerciseId).ThenBy(s => s.SetNumber).ToListAsync();
        return Ok(sets);
    }

    [HttpPost("plans/{planId}/sets")]
    public async Task<IActionResult> LogSet(int planId, [FromBody] WorkoutSet body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId);
        if (plan is null) return NotFound();

        body.WorkoutDayPlanId = planId;
        body.LoggedAt = DateTime.UtcNow;
        _db.WorkoutSets.Add(body);
        await _db.SaveChangesAsync();

        // Update personal record if this is a heavier lift
        if (body.WeightKg.HasValue && body.Reps.HasValue && body.IsCompleted)
        {
            var pr = await _db.PersonalRecords.FirstOrDefaultAsync(pr => pr.UserId == userId && pr.ExerciseId == body.ExerciseId);
            if (pr is null)
            {
                _db.PersonalRecords.Add(new PersonalRecord
                {
                    UserId = userId, ExerciseId = body.ExerciseId,
                    MaxWeightKg = body.WeightKg.Value, Reps = body.Reps.Value,
                    AchievedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });
            }
            else if (body.WeightKg.Value > pr.MaxWeightKg)
            {
                pr.MaxWeightKg = body.WeightKg.Value;
                pr.Reps = body.Reps.Value;
                pr.AchievedAt = DateTime.UtcNow;
                pr.UpdatedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
        }

        return Ok(body);
    }

    [HttpPut("sets/{id}")]
    public async Task<IActionResult> UpdateSet(int id, [FromBody] WorkoutSet body)
    {
        var userId = GetUserId();
        var set = await _db.WorkoutSets
            .Include(s => s.WorkoutDayPlan)
            .FirstOrDefaultAsync(s => s.Id == id && s.WorkoutDayPlan.UserId == userId);
        if (set is null) return NotFound();
        set.Reps = body.Reps;
        set.WeightKg = body.WeightKg;
        set.DurationSeconds = body.DurationSeconds;
        set.IsCompleted = body.IsCompleted;
        set.Notes = body.Notes;
        await _db.SaveChangesAsync();
        return Ok(set);
    }

    [HttpDelete("sets/{id}")]
    public async Task<IActionResult> DeleteSet(int id)
    {
        var userId = GetUserId();
        var set = await _db.WorkoutSets
            .Include(s => s.WorkoutDayPlan)
            .FirstOrDefaultAsync(s => s.Id == id && s.WorkoutDayPlan.UserId == userId);
        if (set is null) return NotFound();
        _db.WorkoutSets.Remove(set);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Personal Records ────────────────────────────────────────────────

    [HttpGet("prs")]
    public async Task<IActionResult> GetPRs()
    {
        var userId = GetUserId();
        var prs = await _db.PersonalRecords
            .Include(pr => pr.Exercise)
            .Where(pr => pr.UserId == userId)
            .ToListAsync();
        return Ok(prs);
    }

    // ─── Images ──────────────────────────────────────────────────────────

    [HttpPost("plans/{planId}/images")]
    public async Task<IActionResult> AddImage(int planId, [FromBody] WorkoutDayImage body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId);
        if (plan is null) return NotFound();
        body.WorkoutDayPlanId = planId;
        body.UploadedAt = DateTime.UtcNow;
        _db.WorkoutDayImages.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpDelete("images/{id}")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        var userId = GetUserId();
        var image = await _db.WorkoutDayImages
            .Include(i => i.WorkoutDayPlan)
            .FirstOrDefaultAsync(i => i.Id == id && i.WorkoutDayPlan.UserId == userId);
        if (image is null) return NotFound();
        _db.WorkoutDayImages.Remove(image);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Analytics ───────────────────────────────────────────────────────

    [HttpGet("analytics/volume")]
    public async Task<IActionResult> GetVolumeHistory([FromQuery] int weeks = 12)
    {
        var userId = GetUserId();
        var since = DateTime.UtcNow.AddDays(-weeks * 7);
        var sets = await _db.WorkoutSets
            .Include(s => s.WorkoutDayPlan)
            .Where(s => s.WorkoutDayPlan.UserId == userId && s.WorkoutDayPlan.Date >= since && s.IsCompleted)
            .ToListAsync();

        var plans = await _db.WorkoutDayPlans
            .Where(p => p.UserId == userId && p.Date >= since)
            .ToListAsync();

        return Ok(new
        {
            weeklyVolume = sets
                .GroupBy(s => System.Globalization.ISOWeek.GetYear(s.WorkoutDayPlan.Date) + "-W" + System.Globalization.ISOWeek.GetWeekOfYear(s.WorkoutDayPlan.Date).ToString("00"))
                .Select(g => new { week = g.Key, totalVolume = g.Sum(s => (s.WeightKg ?? 0) * (s.Reps ?? 0)), totalSets = g.Count() }),
            trainedDates = plans.Where(p => p.IsCompleted).Select(p => p.Date.ToString("yyyy-MM-dd"))
        });
    }
}
