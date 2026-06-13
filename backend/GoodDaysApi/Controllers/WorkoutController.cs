using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Workout;
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

    [HttpGet("splits/active")]
    public async Task<IActionResult> GetActiveSplit()
    {
        var userId = GetUserId();
        var split = await _db.WorkoutSplitPresets
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.IsActive)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();
        return Ok(split);
    }

    [HttpPost("splits")]
    public async Task<IActionResult> CreateSplit([FromBody] WorkoutSplitUpsertRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Split name is required.");

        var entity = new WorkoutSplitPreset
        {
            UserId = GetUserId(),
            Name = body.Name.Trim(),
            DayConfigs = string.IsNullOrWhiteSpace(body.DayConfigs) ? "{}" : body.DayConfigs,
            IsActive = body.IsActive,
            CreatedAt = DateTime.UtcNow,
        };

        _db.WorkoutSplitPresets.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("splits/{id}")]
    public async Task<IActionResult> UpdateSplit(int id, [FromBody] WorkoutSplitUpsertRequest body)
    {
        var userId = GetUserId();
        var split = await _db.WorkoutSplitPresets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (split is null) return NotFound();
        if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest("Split name is required.");

        split.Name = body.Name.Trim();
        split.DayConfigs = string.IsNullOrWhiteSpace(body.DayConfigs) ? "{}" : body.DayConfigs;
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

        if (DateOnly.TryParse(from, out var fromDate))
        {
            var fromUtc = DateTime.SpecifyKind(fromDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            query = query.Where(p => p.Date >= fromUtc);
        }

        if (DateOnly.TryParse(to, out var toDate))
        {
            // Use an exclusive upper bound to include the full 'to' date.
            var toExclusiveUtc = DateTime.SpecifyKind(toDate.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            query = query.Where(p => p.Date < toExclusiveUtc);
        }

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
        if (!DateOnly.TryParse(date, out var parsedDate)) return BadRequest("Invalid date");

        var dayStartUtc = DateTime.SpecifyKind(parsedDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var dayEndUtc = dayStartUtc.AddDays(1);

        var plan = await _db.WorkoutDayPlans
            .Include(p => p.Sets)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Date >= dayStartUtc && p.Date < dayEndUtc);
        return Ok(plan); // can be null — frontend handles "no plan yet" state
    }

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] WorkoutDayPlanUpsertRequest body)
    {
        var entity = new WorkoutDayPlan
        {
            UserId = GetUserId(),
            Date = DateTime.SpecifyKind(body.Date, DateTimeKind.Utc),
            DayLabel = body.DayLabel,
            PlannedExercises = string.IsNullOrWhiteSpace(body.PlannedExercises) ? "[]" : body.PlannedExercises,
            IsCompleted = body.IsCompleted,
            Notes = body.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.WorkoutDayPlans.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("plans/{id}")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] WorkoutDayPlanUpsertRequest body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (plan is null) return NotFound();
        plan.Date = DateTime.SpecifyKind(body.Date, DateTimeKind.Utc);
        plan.DayLabel = body.DayLabel;
        plan.PlannedExercises = string.IsNullOrWhiteSpace(body.PlannedExercises) ? "[]" : body.PlannedExercises;
        plan.IsCompleted = body.IsCompleted;
        plan.Notes = body.Notes;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    [HttpDelete("plans/{id}")]
    public async Task<IActionResult> DeletePlan(int id)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (plan is null) return NotFound();
        _db.WorkoutDayPlans.Remove(plan);
        await _db.SaveChangesAsync();
        return Ok();
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
    public async Task<IActionResult> LogSet(int planId, [FromBody] WorkoutSetCreateRequest body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId);
        if (plan is null) return NotFound();

        var entity = new WorkoutSet
        {
            WorkoutDayPlanId = planId,
            ExerciseId = body.ExerciseId,
            SetNumber = body.SetNumber,
            Reps = body.Reps,
            WeightKg = body.WeightKg,
            DurationSeconds = body.DurationSeconds,
            IsCompleted = body.IsCompleted,
            Notes = body.Notes,
            LoggedAt = DateTime.UtcNow,
        };

        _db.WorkoutSets.Add(entity);
        await _db.SaveChangesAsync();

        // Update personal record if this is a heavier lift
        if (entity.WeightKg.HasValue && entity.Reps.HasValue && entity.IsCompleted)
        {
            var pr = await _db.PersonalRecords.FirstOrDefaultAsync(pr => pr.UserId == userId && pr.ExerciseId == entity.ExerciseId);
            if (pr is null)
            {
                _db.PersonalRecords.Add(new PersonalRecord
                {
                    UserId = userId, ExerciseId = entity.ExerciseId,
                    MaxWeightKg = entity.WeightKg.Value, Reps = entity.Reps.Value,
                    AchievedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });
            }
            else if (entity.WeightKg.Value > pr.MaxWeightKg)
            {
                pr.MaxWeightKg = entity.WeightKg.Value;
                pr.Reps = entity.Reps.Value;
                pr.AchievedAt = DateTime.UtcNow;
                pr.UpdatedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
        }

        return Ok(entity);
    }

    [HttpPut("sets/{id}")]
    public async Task<IActionResult> UpdateSet(int id, [FromBody] WorkoutSetUpdateRequest body)
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
    public async Task<IActionResult> AddImage(int planId, [FromBody] WorkoutDayImageCreateRequest body)
    {
        var userId = GetUserId();
        var plan = await _db.WorkoutDayPlans.FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId);
        if (plan is null) return NotFound();

        if (string.IsNullOrWhiteSpace(body.ImageUrl)) return BadRequest("ImageUrl is required.");

        var entity = new WorkoutDayImage
        {
            WorkoutDayPlanId = planId,
            ImageUrl = body.ImageUrl.Trim(),
            Caption = body.Caption,
            UploadedAt = DateTime.UtcNow,
        };

        _db.WorkoutDayImages.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity);
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
            .Where(s => s.WorkoutDayPlan.UserId == userId && s.WorkoutDayPlan.Date >= since)
            .ToListAsync();

        var completedSets = sets.Where(s => s.IsCompleted).ToList();

        // Count distinct days that have at least one logged set
        var daysWithSets = sets
            .Select(s => s.WorkoutDayPlan.Date.ToString("yyyy-MM-dd"))
            .Distinct()
            .Count();

        var weeklyVolume = completedSets
            .GroupBy(s => System.Globalization.ISOWeek.GetYear(s.WorkoutDayPlan.Date) + "-W" + System.Globalization.ISOWeek.GetWeekOfYear(s.WorkoutDayPlan.Date).ToString("00"))
            .Select(g => new { week = g.Key, totalVolume = g.Sum(s => (s.WeightKg ?? 0) * (s.Reps ?? 0)), totalSets = g.Count() })
            .ToList();

        var trainedDates = sets
            .Select(s => s.WorkoutDayPlan.Date.ToString("yyyy-MM-dd"))
            .Distinct()
            .ToList();

        return Ok(new
        {
            weeks,
            daysLogged = daysWithSets,
            totalSets = sets.Count,
            totalVolume = completedSets.Sum(s => (s.WeightKg ?? 0) * (s.Reps ?? 0)),
            weeklyVolume,
            trainedDates,
        });
    }
}
