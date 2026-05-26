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

    /// <summary>
    /// Auto-upserts a routine_block_template for the given title, then returns its id.
    /// Keyed on (user_id, title) — idempotent.
    /// </summary>
    private async Task<int> UpsertBlockTemplateAsync(int userId, string title, string? category, string? color, string? startTime, string? endTime)
    {
        var trimmed = title.Trim();
        var existing = await _db.RoutineBlockTemplates
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Title == trimmed);

        if (existing is not null) return existing.Id;

        var template = new RoutineBlockTemplate
        {
            UserId = userId,
            Title = trimmed,
            Category = category,
            Color = color,
            DefaultStartTime = startTime,
            DefaultEndTime = endTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.RoutineBlockTemplates.Add(template);
        await _db.SaveChangesAsync();
        return template.Id;
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

        // Auto-upsert a block template so it's available for re-use and stats
        var templateId = await UpsertBlockTemplateAsync(userId, body.Title, body.Category, body.Color, body.StartTime, body.EndTime);

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
            TemplateId = templateId,
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
            block.TemplateId,
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
    public record TodayOverrideAddRequest(string Date, int RoutineId, string Title, string StartTime, string EndTime, string? Category, string? Color, int? SortOrder, int? LinkedWorkoutPlanId, string? MealType);
    public record TodayOverrideBaseUpsertRequest(string Date, int BaseBlockId, string? Title, string? StartTime, string? EndTime, string? Category, string? Color, int? SortOrder, int? LinkedWorkoutPlanId, string? MealType, bool? IsDeleted);
    public record TodayOverrideUpdateRequest(string? Title, string? StartTime, string? EndTime, string? Category, string? Color, int? SortOrder, int? LinkedWorkoutPlanId, string? MealType, bool? IsDeleted);
    public record TodayOverrideReorderItem(int? OverrideId, int? BaseBlockId, int SortOrder);
    public record TodayOverrideReorderRequest(string Date, List<TodayOverrideReorderItem> Items);

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
        var baseBlocks = await _db.RoutineBlocks
            .Where(b => b.RoutineId == routine.Id)
            .Include(b => b.MealLinks)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.StartTime)
            .ToListAsync();

        var overrides = await _db.DailyRoutineBlockOverrides
            .Where(o => o.UserId == userId && o.Date == today && o.RoutineId == routine.Id)
            .ToListAsync();

        var overrideByBase = overrides
            .Where(o => o.BaseBlockId.HasValue)
            .GroupBy(o => o.BaseBlockId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.UpdatedAt).First());

        var addedOverrides = overrides
            .Where(o => !o.BaseBlockId.HasValue && !o.IsDeleted)
            .ToList();

        var linkedWorkoutIds = new HashSet<int>();
        foreach (var b in baseBlocks)
        {
            if (overrideByBase.TryGetValue(b.Id, out var ov))
            {
                if (!ov.IsDeleted && ov.LinkedWorkoutPlanId.HasValue) linkedWorkoutIds.Add(ov.LinkedWorkoutPlanId.Value);
            }
            else if (b.LinkedWorkoutPlanId.HasValue)
            {
                linkedWorkoutIds.Add(b.LinkedWorkoutPlanId.Value);
            }
        }
        foreach (var ov in addedOverrides)
        {
            if (ov.LinkedWorkoutPlanId.HasValue) linkedWorkoutIds.Add(ov.LinkedWorkoutPlanId.Value);
        }

        var workoutLabelMap = linkedWorkoutIds.Count > 0
            ? await _db.WorkoutDayPlans
                .Where(w => linkedWorkoutIds.Contains(w.Id) && w.UserId == userId)
                .ToDictionaryAsync(w => w.Id, w => w.DayLabel)
            : new Dictionary<int, string?>();

        var baseBlockIds = baseBlocks.Select(b => b.Id).ToList();
        var logs = await _db.DailyRoutineLogs
            .Where(l => l.UserId == userId && l.Date == today && l.RoutineBlockId.HasValue && baseBlockIds.Contains(l.RoutineBlockId.Value))
            .ToListAsync();

        var overrideIds = addedOverrides.Select(o => o.Id).ToList();
        var overrideLogs = overrideIds.Count == 0
            ? new List<DailyRoutineOverrideLog>()
            : await _db.DailyRoutineOverrideLogs
                .Where(l => l.UserId == userId && l.Date == today && overrideIds.Contains(l.OverrideId))
                .ToListAsync();

        var blockResults = new List<object>();

        foreach (var b in baseBlocks)
        {
            overrideByBase.TryGetValue(b.Id, out var ov);
            if (ov?.IsDeleted == true) continue;

            var log = logs.FirstOrDefault(l => l.RoutineBlockId == b.Id);
            blockResults.Add(new
            {
                b.Id,
                Title = ov?.Title ?? b.Title,
                StartTime = ov?.StartTime ?? b.StartTime,
                EndTime = ov?.EndTime ?? b.EndTime,
                Category = ov?.Category ?? b.Category,
                Color = ov?.Color ?? b.Color,
                SortOrder = ov?.SortOrder ?? b.SortOrder,
                LinkedWorkoutPlanId = ov?.LinkedWorkoutPlanId ?? b.LinkedWorkoutPlanId,
                LinkedWorkoutLabel = (ov?.LinkedWorkoutPlanId ?? b.LinkedWorkoutPlanId).HasValue
                    && workoutLabelMap.TryGetValue((ov?.LinkedWorkoutPlanId ?? b.LinkedWorkoutPlanId)!.Value, out var label)
                    ? (label ?? "Today Workout")
                    : null,
                MealType = ov?.MealType ?? b.MealType,
                LinkedMealTemplateIds = b.MealLinks.Select(m => m.MealTemplateId).ToList(),
                status = log?.Status ?? "pending",
                logId = log?.Id,
                IsOverride = ov is not null,
                OverrideId = ov?.Id,
                BaseBlockId = b.Id,
            });
        }

        foreach (var ov in addedOverrides)
        {
            var log = overrideLogs.FirstOrDefault(l => l.OverrideId == ov.Id);
            blockResults.Add(new
            {
                Id = 1000000 + ov.Id,
                Title = ov.Title ?? "Untitled",
                StartTime = ov.StartTime ?? "09:00",
                EndTime = ov.EndTime ?? "10:00",
                Category = ov.Category,
                Color = ov.Color,
                SortOrder = ov.SortOrder ?? 0,
                LinkedWorkoutPlanId = ov.LinkedWorkoutPlanId,
                LinkedWorkoutLabel = ov.LinkedWorkoutPlanId.HasValue && workoutLabelMap.TryGetValue(ov.LinkedWorkoutPlanId.Value, out var label)
                    ? (label ?? "Today Workout")
                    : null,
                MealType = ov.MealType,
                LinkedMealTemplateIds = new List<int>(),
                status = log?.Status ?? "pending",
                logId = log?.Id,
                IsOverride = true,
                OverrideId = ov.Id,
                BaseBlockId = (int?)null,
            });
        }

        blockResults = blockResults
            .OrderBy(b => (int?)b.GetType().GetProperty("SortOrder")!.GetValue(b) ?? 0)
            .ThenBy(b => (string?)b.GetType().GetProperty("StartTime")!.GetValue(b) ?? "99:99")
            .ToList();

        var completed = blockResults.Count(b => (string?)b.GetType().GetProperty("status")?.GetValue(b) == "completed");
        var skippedCount = blockResults.Count(b => (string?)b.GetType().GetProperty("status")?.GetValue(b) == "skipped");

        return Ok(new
        {
            date = today.ToString("yyyy-MM-dd"),
            dayOfWeek = todayDow,
            routine = new { routine.Id, routine.Name, routine.Color, routine.Description },
            isSkipped,
            blocks = blockResults,
            stats = new { completed, skipped = skippedCount, total = blockResults.Count },
        });
    }

    // ─── Block Logs (upsert) ──────────────────────────────────────────────

    [HttpPost("logs")]
    public async Task<IActionResult> UpsertLog([FromBody] LogRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        if (body.RoutineBlockId.HasValue == body.OverrideBlockId.HasValue)
            return BadRequest("Provide exactly one of routineBlockId or overrideBlockId.");

        if (body.RoutineBlockId.HasValue)
        {
            var routineBlockId = body.RoutineBlockId.Value;
            var block = await _db.RoutineBlocks
                .Include(b => b.Routine)
                .FirstOrDefaultAsync(b => b.Id == routineBlockId && b.Routine.UserId == userId);
            if (block is null) return NotFound("Block not found");

            var existing = await _db.DailyRoutineLogs
                .FirstOrDefaultAsync(l => l.UserId == userId && l.RoutineBlockId == routineBlockId && l.Date == date);

            if (existing is null)
            {
                var log = new DailyRoutineLog
                {
                    UserId = userId,
                    RoutineBlockId = routineBlockId,
                    Date = date,
                    Status = body.Status,
                    LoggedAt = DateTime.UtcNow,
                };
                _db.DailyRoutineLogs.Add(log);
                await _db.SaveChangesAsync();
                return Ok(log);
            }

            existing.Status = body.Status;
            existing.LoggedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        var overrideId = body.OverrideBlockId!.Value;
        var dayOverride = await _db.DailyRoutineBlockOverrides
            .FirstOrDefaultAsync(o => o.Id == overrideId && o.UserId == userId);
        if (dayOverride is null || dayOverride.IsDeleted) return NotFound("Override block not found");

        var existingOverride = await _db.DailyRoutineOverrideLogs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.OverrideId == overrideId && l.Date == date);

        if (existingOverride is null)
        {
            var log = new DailyRoutineOverrideLog
            {
                UserId = userId,
                OverrideId = overrideId,
                Date = date,
                Status = body.Status,
                LoggedAt = DateTime.UtcNow,
            };
            _db.DailyRoutineOverrideLogs.Add(log);
            await _db.SaveChangesAsync();
            return Ok(log);
        }

        existingOverride.Status = body.Status;
        existingOverride.LoggedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(existingOverride);
    }

    public record LogRequest(int? RoutineBlockId, int? OverrideBlockId, string Date, string Status);

    // ─── Today Day-Only Overrides ───────────────────────────────────────

    [HttpPost("today/overrides/add")]
    public async Task<IActionResult> AddTodayOverride([FromBody] TodayOverrideAddRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        var routine = await _db.DailyRoutines.FirstOrDefaultAsync(r => r.Id == body.RoutineId && r.UserId == userId);
        if (routine is null) return NotFound("Routine not found");

        var validatedWorkoutPlanId = await GetValidatedWorkoutPlanIdAsync(userId, body.LinkedWorkoutPlanId);

        var row = new DailyRoutineBlockOverride
        {
            UserId = userId,
            Date = date,
            RoutineId = body.RoutineId,
            BaseBlockId = null,
            Title = body.Title,
            StartTime = body.StartTime,
            EndTime = body.EndTime,
            Category = body.Category,
            Color = body.Color,
            SortOrder = body.SortOrder,
            LinkedWorkoutPlanId = validatedWorkoutPlanId,
            MealType = string.IsNullOrWhiteSpace(body.MealType) ? null : body.MealType.Trim(),
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.DailyRoutineBlockOverrides.Add(row);
        await _db.SaveChangesAsync();
        return Ok(row);
    }

    [HttpPost("today/overrides/base")]
    public async Task<IActionResult> UpsertTodayBaseOverride([FromBody] TodayOverrideBaseUpsertRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        var baseBlock = await _db.RoutineBlocks
            .Include(b => b.Routine)
            .FirstOrDefaultAsync(b => b.Id == body.BaseBlockId && b.Routine.UserId == userId);
        if (baseBlock is null) return NotFound("Base block not found");

        var validatedWorkoutPlanId = await GetValidatedWorkoutPlanIdAsync(userId, body.LinkedWorkoutPlanId);

        var existing = await _db.DailyRoutineBlockOverrides
            .FirstOrDefaultAsync(o => o.UserId == userId && o.Date == date && o.BaseBlockId == body.BaseBlockId);

        if (existing is null)
        {
            existing = new DailyRoutineBlockOverride
            {
                UserId = userId,
                Date = date,
                RoutineId = baseBlock.RoutineId,
                BaseBlockId = baseBlock.Id,
                Title = body.Title ?? baseBlock.Title,
                StartTime = body.StartTime ?? baseBlock.StartTime,
                EndTime = body.EndTime ?? baseBlock.EndTime,
                Category = body.Category ?? baseBlock.Category,
                Color = body.Color ?? baseBlock.Color,
                SortOrder = body.SortOrder ?? baseBlock.SortOrder,
                LinkedWorkoutPlanId = body.LinkedWorkoutPlanId.HasValue ? validatedWorkoutPlanId : baseBlock.LinkedWorkoutPlanId,
                MealType = body.MealType ?? baseBlock.MealType,
                IsDeleted = body.IsDeleted ?? false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.DailyRoutineBlockOverrides.Add(existing);
        }
        else
        {
            existing.Title = body.Title ?? existing.Title ?? baseBlock.Title;
            existing.StartTime = body.StartTime ?? existing.StartTime ?? baseBlock.StartTime;
            existing.EndTime = body.EndTime ?? existing.EndTime ?? baseBlock.EndTime;
            existing.Category = body.Category ?? existing.Category ?? baseBlock.Category;
            existing.Color = body.Color ?? existing.Color ?? baseBlock.Color;
            existing.SortOrder = body.SortOrder ?? existing.SortOrder ?? baseBlock.SortOrder;
            existing.LinkedWorkoutPlanId = body.LinkedWorkoutPlanId.HasValue ? validatedWorkoutPlanId : existing.LinkedWorkoutPlanId;
            if (body.MealType is not null) existing.MealType = body.MealType;
            if (body.IsDeleted.HasValue) existing.IsDeleted = body.IsDeleted.Value;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpPut("today/overrides/{id}")]
    public async Task<IActionResult> UpdateTodayOverride(int id, [FromBody] TodayOverrideUpdateRequest body)
    {
        var userId = GetUserId();
        var row = await _db.DailyRoutineBlockOverrides.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (row is null) return NotFound();

        var validatedWorkoutPlanId = await GetValidatedWorkoutPlanIdAsync(userId, body.LinkedWorkoutPlanId);

        if (body.Title is not null) row.Title = body.Title;
        if (body.StartTime is not null) row.StartTime = body.StartTime;
        if (body.EndTime is not null) row.EndTime = body.EndTime;
        if (body.Category is not null) row.Category = body.Category;
        if (body.Color is not null) row.Color = body.Color;
        if (body.SortOrder.HasValue) row.SortOrder = body.SortOrder.Value;
        if (body.LinkedWorkoutPlanId.HasValue) row.LinkedWorkoutPlanId = validatedWorkoutPlanId;
        if (body.MealType is not null) row.MealType = body.MealType;
        if (body.IsDeleted.HasValue) row.IsDeleted = body.IsDeleted.Value;
        row.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(row);
    }

    [HttpDelete("today/overrides/{id}")]
    public async Task<IActionResult> DeleteTodayOverride(int id)
    {
        var userId = GetUserId();
        var row = await _db.DailyRoutineBlockOverrides.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (row is null) return NotFound();
        _db.DailyRoutineBlockOverrides.Remove(row);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("today/overrides/reorder")]
    public async Task<IActionResult> ReorderTodayOverrides([FromBody] TodayOverrideReorderRequest body)
    {
        var userId = GetUserId();
        var date = DateOnly.Parse(body.Date);

        foreach (var item in body.Items)
        {
            if (item.OverrideId.HasValue)
            {
                var row = await _db.DailyRoutineBlockOverrides.FirstOrDefaultAsync(o => o.Id == item.OverrideId.Value && o.UserId == userId && o.Date == date);
                if (row is null) continue;
                row.SortOrder = item.SortOrder;
                row.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            if (!item.BaseBlockId.HasValue) continue;

            var baseBlock = await _db.RoutineBlocks
                .Include(b => b.Routine)
                .FirstOrDefaultAsync(b => b.Id == item.BaseBlockId.Value && b.Routine.UserId == userId);
            if (baseBlock is null) continue;

            var existing = await _db.DailyRoutineBlockOverrides
                .FirstOrDefaultAsync(o => o.UserId == userId && o.Date == date && o.BaseBlockId == baseBlock.Id);

            if (existing is null)
            {
                existing = new DailyRoutineBlockOverride
                {
                    UserId = userId,
                    Date = date,
                    RoutineId = baseBlock.RoutineId,
                    BaseBlockId = baseBlock.Id,
                    Title = baseBlock.Title,
                    StartTime = baseBlock.StartTime,
                    EndTime = baseBlock.EndTime,
                    Category = baseBlock.Category,
                    Color = baseBlock.Color,
                    SortOrder = item.SortOrder,
                    LinkedWorkoutPlanId = baseBlock.LinkedWorkoutPlanId,
                    MealType = baseBlock.MealType,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.DailyRoutineBlockOverrides.Add(existing);
            }
            else
            {
                existing.SortOrder = item.SortOrder;
                existing.IsDeleted = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

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
