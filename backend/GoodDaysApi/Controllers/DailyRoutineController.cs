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

    // ─── Routines CRUD ────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAllRoutines()
    {
        var userId = GetUserId();
        var routines = await _db.DailyRoutines
            .Include(r => r.Blocks.OrderBy(b => b.SortOrder).ThenBy(b => b.StartTime))
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Name)
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

    // ─── Blocks CRUD ──────────────────────────────────────────────────────

    [HttpPost("{routineId}/blocks")]
    public async Task<IActionResult> AddBlock(int routineId, [FromBody] RoutineBlockRequest body)
    {
        var userId = GetUserId();
        var routine = await _db.DailyRoutines.FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId);
        if (routine is null) return NotFound();
        var block = new RoutineBlock
        {
            RoutineId = routineId,
            Title = body.Title,
            StartTime = body.StartTime,
            EndTime = body.EndTime,
            Category = body.Category,
            Color = body.Color,
            SortOrder = body.SortOrder ?? 0,
            CreatedAt = DateTime.UtcNow,
        };

        _db.RoutineBlocks.Add(block);
        await _db.SaveChangesAsync();
        return Ok(block);
    }

    [HttpPut("blocks/{id}")]
    public async Task<IActionResult> UpdateBlock(int id, [FromBody] RoutineBlockRequest body)
    {
        var userId = GetUserId();
        var block = await _db.RoutineBlocks
            .Include(b => b.Routine)
            .FirstOrDefaultAsync(b => b.Id == id && b.Routine.UserId == userId);
        if (block is null) return NotFound();
        block.Title = body.Title;
        block.StartTime = body.StartTime;
        block.EndTime = body.EndTime;
        block.Category = body.Category;
        block.Color = body.Color;
        if (body.SortOrder.HasValue) block.SortOrder = body.SortOrder.Value;
        await _db.SaveChangesAsync();
        return Ok(block);
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
    public record RoutineBlockRequest(string Title, string StartTime, string EndTime, string? Category, string? Color, int? SortOrder);
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
            .OrderBy(b => b.SortOrder).ThenBy(b => b.StartTime)
            .ToListAsync();

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
