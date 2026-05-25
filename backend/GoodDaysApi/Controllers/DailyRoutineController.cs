using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/dailyroutine")]
[Authorize]
public class DailyRoutineController : ControllerBase
{
    private readonly AppDbContext _db;
    public DailyRoutineController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    private async Task<int?> GetValidatedWorkoutPlanIdAsync(int userId, int? linkedWorkoutPlanId)
    {
        if (!linkedWorkoutPlanId.HasValue) return null;

        var exists = await _db.WorkoutDayPlans
            .AnyAsync(p => p.Id == linkedWorkoutPlanId.Value && p.UserId == userId);

        return exists ? linkedWorkoutPlanId.Value : null;
    }

    private async Task<List<int>> GetValidatedMealIdsAsync(int userId, List<int>? linkedMealTemplateIds)
    {
        if (linkedMealTemplateIds is null || linkedMealTemplateIds.Count == 0) return new List<int>();

        var requested = linkedMealTemplateIds.Where(id => id > 0).Distinct().ToList();
        if (requested.Count == 0) return new List<int>();

        return await _db.MealTemplates
            .Where(m => m.UserId == userId && requested.Contains(m.Id))
            .Select(m => m.Id)
            .ToListAsync();
    }

    private async Task SyncBlockMealLinksAsync(int blockId, List<int> validatedMealIds)
    {
        var existing = await _db.RoutineBlockMealLinks
            .Where(l => l.RoutineBlockId == blockId)
            .ToListAsync();

        var validatedSet = validatedMealIds.ToHashSet();
        var toRemove = existing.Where(l => !validatedSet.Contains(l.MealTemplateId)).ToList();
        if (toRemove.Count > 0)
        {
            _db.RoutineBlockMealLinks.RemoveRange(toRemove);
        }

        var existingSet = existing.Select(l => l.MealTemplateId).ToHashSet();
        var toAdd = validatedMealIds
            .Where(id => !existingSet.Contains(id))
            .Select(id => new RoutineBlockMealLink
            {
                RoutineBlockId = blockId,
                MealTemplateId = id,
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        if (toAdd.Count > 0)
        {
            await _db.RoutineBlockMealLinks.AddRangeAsync(toAdd);
        }
    }

    // ─── Routines CRUD ────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAllRoutines()
    {
        var userId = GetUserId();
        var routines = await _db.DailyRoutines
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.UserId,
                r.Name,
                r.Description,
                r.Color,
                r.CreatedAt,
                r.UpdatedAt,
                Blocks = r.Blocks
                    .OrderBy(b => b.SortOrder)
                    .ThenBy(b => b.StartTime)
                    .Select(b => new
                    {
                        b.Id,
                        b.RoutineId,
                        b.Title,
                        b.StartTime,
                        b.EndTime,
                        b.Category,
                        b.Color,
                        b.SortOrder,
                        b.CreatedAt,
                        b.LinkedWorkoutPlanId,
                        LinkedWorkoutLabel = b.LinkedWorkoutPlan != null ? (b.LinkedWorkoutPlan.DayLabel ?? "Today Workout") : null,
                        b.MealType,
                        LinkedMealTemplateIds = b.MealLinks.Select(l => l.MealTemplateId).ToList(),
                    }).ToList(),
            })
            .ToListAsync();
        return Ok(routines);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoutine([FromBody] RoutineRequest body)
    {
        var routine = new DailyRoutine
        {
            UserId = GetUserId(),
            Name = body.Name,
            Description = body.Description,
            Color = string.IsNullOrWhiteSpace(body.Color) ? "#6C63FF" : body.Color,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.DailyRoutines.Add(routine);
        await _db.SaveChangesAsync();
        return Ok(routine);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRoutine(int id, [FromBody] RoutineRequest body)
    {
        var userId = GetUserId();
        var routine = await _db.DailyRoutines.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (routine is null) return NotFound();
        routine.Name = body.Name;
        routine.Description = body.Description;
        routine.Color = string.IsNullOrWhiteSpace(body.Color) ? routine.Color : body.Color;
        routine.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(routine);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRoutine(int id)
    {
        var userId = GetUserId();
        var routine = await _db.DailyRoutines.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (routine is null) return NotFound();
        _db.DailyRoutines.Remove(routine);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id}/copy")]
    public async Task<IActionResult> CopyRoutine(int id)
    {
        var userId = GetUserId();
        var source = await _db.DailyRoutines
            .Include(r => r.Blocks)
                .ThenInclude(b => b.MealLinks)
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (source is null) return NotFound();

        var copy = new DailyRoutine
        {
            UserId = userId,
            Name = $"{source.Name} (Copy)",
            Description = source.Description,
            Color = source.Color,
        };
        _db.DailyRoutines.Add(copy);
        await _db.SaveChangesAsync();

        foreach (var block in source.Blocks)
        {
            var newBlock = new RoutineBlock
            {
                RoutineId = copy.Id,
                Title = block.Title,
                StartTime = block.StartTime,
                EndTime = block.EndTime,
                Category = block.Category,
                Color = block.Color,
                SortOrder = block.SortOrder,
                LinkedWorkoutPlanId = block.LinkedWorkoutPlanId,
            };
            _db.RoutineBlocks.Add(newBlock);
            await _db.SaveChangesAsync();

            foreach (var mealLink in block.MealLinks)
            {
                _db.RoutineBlockMealLinks.Add(new RoutineBlockMealLink
                {
                    RoutineBlockId = newBlock.Id,
                    MealTemplateId = mealLink.MealTemplateId,
                });
            }
        }
        await _db.SaveChangesAsync();

        return Ok(new { id = copy.Id, name = copy.Name });
    }



    [HttpPost("{routineId}/blocks")]
    public async Task<IActionResult> AddBlock(int routineId, [FromBody] RoutineBlockRequest body)
    {
        var userId = GetUserId();
        var routine = await _db.DailyRoutines.FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId);
        if (routine is null) return NotFound();

        var validatedWorkoutPlanId = await GetValidatedWorkoutPlanIdAsync(userId, body.LinkedWorkoutPlanId);
        var validatedMealIds = await GetValidatedMealIdsAsync(userId, body.LinkedMealTemplateIds);

        var block = new RoutineBlock
        {
            RoutineId = routineId,
            Title = body.Title,
            StartTime = body.StartTime,
            EndTime = body.EndTime,
            Category = body.Category,
            Color = body.Color,
            SortOrder = body.SortOrder ?? 0,
            LinkedWorkoutPlanId = validatedWorkoutPlanId,
            MealType = string.IsNullOrWhiteSpace(body.MealType) ? null : body.MealType.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.RoutineBlocks.Add(block);
        await _db.SaveChangesAsync();

        await SyncBlockMealLinksAsync(block.Id, validatedMealIds);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            block.Id,
            block.RoutineId,
            block.Title,
            block.StartTime,
            block.EndTime,
            block.Category,
            block.Color,
            block.SortOrder,
            block.CreatedAt,
            block.LinkedWorkoutPlanId,
            block.MealType,
            LinkedMealTemplateIds = validatedMealIds,
        });
    }

    [HttpPut("blocks/{id}")]
    public async Task<IActionResult> UpdateBlock(int id, [FromBody] RoutineBlockRequest body)
    {
        var userId = GetUserId();
        var block = await _db.RoutineBlocks
            .Include(b => b.Routine)
            .FirstOrDefaultAsync(b => b.Id == id && b.Routine.UserId == userId);
        if (block is null) return NotFound();

        var validatedWorkoutPlanId = await GetValidatedWorkoutPlanIdAsync(userId, body.LinkedWorkoutPlanId);
        var validatedMealIds = await GetValidatedMealIdsAsync(userId, body.LinkedMealTemplateIds);

        block.Title = body.Title;
        block.StartTime = body.StartTime;
        block.EndTime = body.EndTime;
        block.Category = body.Category;
        block.Color = body.Color;
        block.LinkedWorkoutPlanId = validatedWorkoutPlanId;
        block.MealType = string.IsNullOrWhiteSpace(body.MealType) ? null : body.MealType.Trim();
        if (body.SortOrder.HasValue) block.SortOrder = body.SortOrder.Value;

        await SyncBlockMealLinksAsync(block.Id, validatedMealIds);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            block.Id,
            block.RoutineId,
            block.Title,
            block.StartTime,
            block.EndTime,
            block.Category,
            block.Color,
            block.SortOrder,
            block.CreatedAt,
            block.LinkedWorkoutPlanId,
            block.MealType,
            LinkedMealTemplateIds = validatedMealIds,
        });
    }

    [HttpDelete("blocks/{id}")]
    public async Task<IActionResult> DeleteBlock(int id)
    {
        var userId = GetUserId();
        var block = await _db.RoutineBlocks
            .Include(b => b.Routine)
            .FirstOrDefaultAsync(b => b.Id == id && b.Routine.UserId == userId);
        if (block is null) return NotFound();
        _db.RoutineBlocks.Remove(block);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ─── Weekly Schedule ──────────────────────────────────────────────────

    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule()
    {
        var userId = GetUserId();
        var schedule = await _db.WeeklyRoutineSchedules
            .Include(s => s.Routine).ThenInclude(r => r != null ? r.Blocks : null!)
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.DayOfWeek)
            .ToListAsync();
        return Ok(schedule);
    }

    // PUT body: [ { dayOfWeek: 0, routineId: 1 }, { dayOfWeek: 1, routineId: null }, ... ]
    [HttpPut("schedule")]
    public async Task<IActionResult> UpdateSchedule([FromBody] List<ScheduleEntry> entries)
    {
        var userId = GetUserId();
        foreach (var entry in entries)
        {
            var existing = await _db.WeeklyRoutineSchedules
                .FirstOrDefaultAsync(s => s.UserId == userId && s.DayOfWeek == entry.DayOfWeek);
            if (existing is null)
            {
                _db.WeeklyRoutineSchedules.Add(new WeeklyRoutineSchedule
                {
                    UserId = userId,
                    DayOfWeek = entry.DayOfWeek,
                    RoutineId = entry.RoutineId,
                });
            }
            else
            {
                existing.RoutineId = entry.RoutineId;
            }
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    public record RoutineRequest(string Name, string? Description, string? Color);
    public record RoutineBlockRequest(string Title, string StartTime, string EndTime, string? Category, string? Color, int? SortOrder, int? LinkedWorkoutPlanId, string? MealType, List<int>? LinkedMealTemplateIds);
    public record ScheduleEntry(int DayOfWeek, int? RoutineId);

    // ─── Today ────────────────────────────────────────────────────────────

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var userId = GetUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayDow = (int)DateTime.UtcNow.DayOfWeek; // 0=Sun, 1=Mon, ...

        var scheduleEntry = await _db.WeeklyRoutineSchedules
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.DayOfWeek == todayDow);

        var isSkipped = await _db.DailyRoutineSkips
            .AnyAsync(s => s.UserId == userId && s.Date == today);

        if (scheduleEntry?.Routine is null)
        {
            return Ok(new
            {
                date = today.ToString("yyyy-MM-dd"),
                dayOfWeek = todayDow,
                routine = (object?)null,
                isSkipped,
                blocks = Array.Empty<object>(),
                stats = new { completed = 0, skipped = 0, total = 0 },
            });
        }

        var routine = scheduleEntry.Routine;
        var blocks = await _db.RoutineBlocks
            .Where(b => b.RoutineId == routine.Id)
            .Include(b => b.MealLinks)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.StartTime)
            .ToListAsync();

        var linkedWorkoutIds = blocks
            .Where(b => b.LinkedWorkoutPlanId.HasValue)
            .Select(b => b.LinkedWorkoutPlanId!.Value)
            .Distinct()
            .ToList();
        var workoutLabelMap = linkedWorkoutIds.Count > 0
            ? await _db.WorkoutDayPlans
                .Where(w => linkedWorkoutIds.Contains(w.Id) && w.UserId == userId)
                .ToDictionaryAsync(w => w.Id, w => w.DayLabel)
            : new Dictionary<int, string?>();

        var logs = await _db.DailyRoutineLogs
            .Where(l => l.UserId == userId && l.Date == today && blocks.Select(b => b.Id).Contains(l.RoutineBlockId))
            .ToListAsync();

        var blockResults = blocks.Select(b =>
        {
            var log = logs.FirstOrDefault(l => l.RoutineBlockId == b.Id);
            return new
            {
                b.Id,
                b.Title,
                b.StartTime,
                b.EndTime,
                b.Category,
                b.Color,
                b.SortOrder,
                b.LinkedWorkoutPlanId,
                LinkedWorkoutLabel = b.LinkedWorkoutPlanId.HasValue && workoutLabelMap.TryGetValue(b.LinkedWorkoutPlanId.Value, out var label)
                    ? (label ?? "Today Workout")
                    : null,
                b.MealType,
                LinkedMealTemplateIds = b.MealLinks.Select(m => m.MealTemplateId).ToList(),
                status = log?.Status ?? "pending",
                logId = log?.Id,
            };
        }).ToList();

        var completed = blockResults.Count(b => b.status == "completed");
        var skippedCount = blockResults.Count(b => b.status == "skipped");

        return Ok(new
        {
            date = today.ToString("yyyy-MM-dd"),
            dayOfWeek = todayDow,
            routine = new { routine.Id, routine.Name, routine.Color, routine.Description },
            isSkipped,
            blocks = blockResults,
            stats = new { completed, skipped = skippedCount, total = blocks.Count },
        });
    }

    // ─── Block Logs (upsert) ──────────────────────────────────────────────

    [HttpPost("logs")]
    public async Task<IActionResult> UpsertLog([FromBody] LogRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        // Verify block ownership
        var block = await _db.RoutineBlocks
            .Include(b => b.Routine)
            .FirstOrDefaultAsync(b => b.Id == body.RoutineBlockId && b.Routine.UserId == userId);
        if (block is null) return NotFound("Block not found");

        var existing = await _db.DailyRoutineLogs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.RoutineBlockId == body.RoutineBlockId && l.Date == date);

        if (existing is null)
        {
            var log = new DailyRoutineLog
            {
                UserId = userId,
                RoutineBlockId = body.RoutineBlockId,
                Date = date,
                Status = body.Status,
                LoggedAt = DateTime.UtcNow,
            };
            _db.DailyRoutineLogs.Add(log);
            await _db.SaveChangesAsync();
            return Ok(log);
        }
        else
        {
            existing.Status = body.Status;
            existing.LoggedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
    }

    public record LogRequest(int RoutineBlockId, string Date, string Status);

    // ─── Skip Whole Day ───────────────────────────────────────────────────

    [HttpPost("skip")]
    public async Task<IActionResult> SkipDay([FromBody] SkipRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        var existing = await _db.DailyRoutineSkips
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Date == date);

        if (existing is null)
        {
            var skip = new DailyRoutineSkip
            {
                UserId = userId,
                Date = date,
                Reason = body.Reason,
                CreatedAt = DateTime.UtcNow,
            };
            _db.DailyRoutineSkips.Add(skip);
            await _db.SaveChangesAsync();
            return Ok(skip);
        }
        else
        {
            // Un-skip if called again (toggle)
            _db.DailyRoutineSkips.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { unSkipped = true });
        }
    }

    public record SkipRequest(string Date, string? Reason);

    // ─── History ─────────────────────────────────────────────────────────

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] string from, [FromQuery] string to)
    {
        var userId = GetUserId();
        if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
            return BadRequest("Invalid date range");

        var logs = await _db.DailyRoutineLogs
            .Include(l => l.RoutineBlock)
            .Where(l => l.UserId == userId && l.Date >= fromDate && l.Date <= toDate)
            .OrderBy(l => l.Date).ThenBy(l => l.RoutineBlock.StartTime)
            .ToListAsync();

        var skips = await _db.DailyRoutineSkips
            .Where(s => s.UserId == userId && s.Date >= fromDate && s.Date <= toDate)
            .ToListAsync();

        return Ok(new
        {
            logs = logs.Select(l => new
            {
                l.Id,
                l.RoutineBlockId,
                blockTitle = l.RoutineBlock.Title,
                blockStartTime = l.RoutineBlock.StartTime,
                date = l.Date.ToString("yyyy-MM-dd"),
                l.Status,
                l.LoggedAt,
            }),
            skips = skips.Select(s => new
            {
                s.Id,
                date = s.Date.ToString("yyyy-MM-dd"),
                s.Reason,
                s.CreatedAt,
            }),
        });
    }
}
