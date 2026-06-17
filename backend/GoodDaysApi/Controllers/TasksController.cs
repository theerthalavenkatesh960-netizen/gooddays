using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserTasks(int userId)
    {
        var tasks = await _db.Tasks.Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTask(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest req)
    {
        // if the client did not supply a RecurrenceId for a recurring task, generate one
        int? recurrenceId = req.Recurring ? req.RecurrenceId : null;

        static DateTime Utc(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc);
        static DateTime? UtcN(DateTime? dt) => dt.HasValue ? DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc) : null;

        // compute default start/end dates
        // if client did not provide recurrence window, default to today through 30 days out
        var startDate = req.RecurrenceStartDate.HasValue ? Utc(req.RecurrenceStartDate.Value).Date : DateTime.UtcNow.Date;
        var endDate = req.RecurrenceEndDate.HasValue ? Utc(req.RecurrenceEndDate.Value).Date : startDate.AddDays(30);

        // determine effective due date for a non-recurring task
        DateTime? effectiveDue = req.DueDate.HasValue ? UtcN(req.DueDate) : null;
        if (!req.Recurring && !effectiveDue.HasValue)
        {
            effectiveDue = startDate;
        }

        if (req.Recurring && req.RecurrenceInterval.HasValue && !string.IsNullOrEmpty(req.RecurrenceUnit))
        {
            // Generate a recurrence ID if not provided
            if (!recurrenceId.HasValue)
            {
                recurrenceId = (int)(DateTime.UtcNow.Ticks % int.MaxValue);
            }

            // generate a series spanning startDate..endDate
            var tasks = GenerateRecurringTasks(
                req.UserId,
                req.Title,
                req.Category,
                req.Priority,
                startDate,
                endDate,
                req.RecurrenceInterval.Value,
                req.RecurrenceUnit,
                req.RecurrenceDays,
                recurrenceId.Value,
                req.Status
            );

            _db.Tasks.AddRange(tasks);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Recurring tasks created", count = tasks.Count, recurrenceId });
        }
        else
        {
            // single task
            var task = new DailyTask
            {
                UserId = req.UserId,
                Title = req.Title,
                Category = req.Category,
                Priority = req.Priority,
                DueDate = effectiveDue.HasValue ? DateTime.SpecifyKind(effectiveDue.Value, DateTimeKind.Utc) : null,
                Recurring = req.Recurring,
                RecurrenceStartDate = req.RecurrenceStartDate.HasValue ? DateTime.SpecifyKind(req.RecurrenceStartDate.Value, DateTimeKind.Utc) : null,
                RecurrenceEndDate = req.RecurrenceEndDate.HasValue ? DateTime.SpecifyKind(req.RecurrenceEndDate.Value, DateTimeKind.Utc) : null,
                RecurrenceDays = req.RecurrenceDays,
                RecurrenceId = recurrenceId,
                RecurrenceInterval = req.RecurrenceInterval,
                RecurrenceUnit = req.RecurrenceUnit,
                Status = req.Status,
                NotesJson = req.NotesJson
            };
            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();
            return Ok(task);
        }
    }

    private List<DailyTask> GenerateRecurringTasks(
        int userId,
        string title,
        string? category,
        string? priority,
        DateTime startDate,
        DateTime endDate,
        int interval,
        string unit,
        string[]? recurrenceDays, int recurrenceId,
        string status)
    {
        var tasks = new List<DailyTask>();

        // helper to add a task for a specific date if it's within range
        void MaybeAdd(DateTime d)
        {
            if (d < startDate || d > endDate) return;
            tasks.Add(new DailyTask
            {
                UserId = userId,
                Title = title,
                Category = category,
                Priority = priority,
                DueDate = DateTime.SpecifyKind(d, DateTimeKind.Utc),
                Recurring = true,
                RecurrenceStartDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc),
                RecurrenceEndDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc),
                RecurrenceId = recurrenceId,
                RecurrenceInterval = interval,
                RecurrenceUnit = unit,
                RecurrenceDays = recurrenceDays,
                Status = status,
                CreatedAt = DateTime.UtcNow
            });
        }

        switch (unit)
        {
            case "days":
            {
                var d = startDate.Date;
                while (d <= endDate.Date)
                {
                    MaybeAdd(d);
                    d = d.AddDays(interval);
                }
                break;
            }
            case "weeks":
            {
                // Convert recurrenceDays strings to DayOfWeek enums if provided
                var daysOfWeek = new List<DayOfWeek>();
                if (recurrenceDays != null)
                {
                    foreach (var s in recurrenceDays)
                    {
                        if (Enum.TryParse<DayOfWeek>(s, true, out var dow))
                            daysOfWeek.Add(dow);
                    }
                }

                var weekStart = startDate.Date;
                while (weekStart <= endDate.Date)
                {
                    if (daysOfWeek.Count == 0)
                    {
                        // no specific weekdays -> treat start of week as occurrence
                        MaybeAdd(weekStart);
                    }
                    else
                    {
                        // add each requested weekday within this week
                        for (int i = 0; i < 7; i++)
                        {
                            var candidate = weekStart.AddDays(i);
                            if (candidate > endDate) break;
                            if (daysOfWeek.Contains(candidate.DayOfWeek))
                                MaybeAdd(candidate);
                        }
                    }
                    weekStart = weekStart.AddDays(7 * interval);
                }
                break;
            }
            case "months":
            {
                // choose day-of-month either from recurrenceDays[0] or startDate.Day
                int dayOfMonth = startDate.Day;
                if (recurrenceDays != null && recurrenceDays.Length > 0 && int.TryParse(recurrenceDays[0], out var parsed))
                    dayOfMonth = parsed;

                var iter = new DateTime(startDate.Year, startDate.Month, 1);
                while (iter <= endDate.Date)
                {
                    var dim = DateTime.DaysInMonth(iter.Year, iter.Month);
                    var occDay = Math.Min(dayOfMonth, dim);
                    MaybeAdd(new DateTime(iter.Year, iter.Month, occDay));
                    iter = iter.AddMonths(interval);
                }
                break;
            }
            case "years":
            {
                var month = startDate.Month;
                var day = startDate.Day;
                var iter = new DateTime(startDate.Year, month, 1);
                while (iter <= endDate.Date)
                {
                    var dim = DateTime.DaysInMonth(iter.Year, month);
                    var occDay = Math.Min(day, dim);
                    MaybeAdd(new DateTime(iter.Year, month, occDay));
                    iter = iter.AddYears(interval);
                }
                break;
            }
            default:
            {
                // fallback: daily
                var d = startDate.Date;
                while (d <= endDate.Date)
                {
                    MaybeAdd(d);
                    d = d.AddDays(interval);
                }
                break;
            }
        }

        return tasks;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest req)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        // determine if recurrence parameters are being modified/toggled
        bool wasRecurring = task.Recurring;
        bool nowRecurring = req.Recurring ?? wasRecurring;
        bool recurrenceParamsChanged = false;
        if (req.RecurrenceInterval.HasValue || !string.IsNullOrEmpty(req.RecurrenceUnit) || req.RecurrenceStartDate.HasValue || req.RecurrenceEndDate.HasValue || req.RecurrenceDays != null)
            recurrenceParamsChanged = true;

        // if we switched from non-recurring to recurring, or recurrence parameters changed while recurring,
        // we regenerate the series
        if (nowRecurring && (!wasRecurring || recurrenceParamsChanged))
        {
            // delete old series if present
            if (task.RecurrenceId.HasValue)
            {
                var related = await _db.Tasks.Where(t => t.RecurrenceId == task.RecurrenceId.Value).ToListAsync();
                _db.Tasks.RemoveRange(related);
                await _db.SaveChangesAsync();
            }

            // figure out new recurrence properties using request values or existing task values
            var startDate = DateTime.SpecifyKind(req.RecurrenceStartDate?.Date ?? task.RecurrenceStartDate?.Date ?? DateTime.UtcNow.Date, DateTimeKind.Utc);
            var endDate = DateTime.SpecifyKind(req.RecurrenceEndDate?.Date ?? task.RecurrenceEndDate?.Date ?? startDate.AddDays(30), DateTimeKind.Utc);
            var interval = req.RecurrenceInterval ?? task.RecurrenceInterval ?? 1;
            var unit = req.RecurrenceUnit ?? task.RecurrenceUnit ?? "days";
            var days = req.RecurrenceDays ?? task.RecurrenceDays;
            var recurrenceId = req.RecurrenceId ?? task.RecurrenceId ?? 0;
            var title = req.Title ?? task.Title;
            var category = req.Category ?? task.Category;
            var priority = req.Priority ?? task.Priority;
            var status = req.Status ?? task.Status;

            var tasks = GenerateRecurringTasks(
                task.UserId,
                title,
                category,
                priority,
                startDate,
                endDate,
                interval,
                unit,
                days,
                recurrenceId,
                status
            );

            _db.Tasks.AddRange(tasks);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Recurring tasks updated", count = tasks.Count, recurrenceId });
        }
        // if we switched from recurring to non-recurring, delete series except this one
        if (!nowRecurring && wasRecurring)
        {
            if (task.RecurrenceId.HasValue)
            {
                var related = await _db.Tasks.Where(t => t.RecurrenceId == task.RecurrenceId.Value && t.Id != id).ToListAsync();
                _db.Tasks.RemoveRange(related);
            }
            task.Recurring = false;
            task.RecurrenceId = null;
        }

        // now apply standard updates to the primary task record
        task.Title = req.Title ?? task.Title;
        task.Category = req.Category ?? task.Category;
        task.Priority = req.Priority ?? task.Priority;
        if (req.DueDate.HasValue) task.DueDate = DateTime.SpecifyKind(req.DueDate.Value, DateTimeKind.Utc);
        if (req.Recurring.HasValue) task.Recurring = req.Recurring.Value;
        if (req.RecurrenceStartDate.HasValue) task.RecurrenceStartDate = DateTime.SpecifyKind(req.RecurrenceStartDate.Value, DateTimeKind.Utc);
        if (req.RecurrenceEndDate.HasValue) task.RecurrenceEndDate = DateTime.SpecifyKind(req.RecurrenceEndDate.Value, DateTimeKind.Utc);
        if (req.RecurrenceDays != null) task.RecurrenceDays = req.RecurrenceDays;
        if (req.RecurrenceId.HasValue) task.RecurrenceId = req.RecurrenceId;
        if (req.RecurrenceInterval.HasValue) task.RecurrenceInterval = req.RecurrenceInterval.Value;
        if (!string.IsNullOrEmpty(req.RecurrenceUnit)) task.RecurrenceUnit = req.RecurrenceUnit;
        task.Status = req.Status ?? task.Status;
        if (req.CompletedAt.HasValue) task.CompletedAt = DateTime.SpecifyKind(req.CompletedAt.Value, DateTimeKind.Utc);
        if (req.IsCompleted.HasValue)
        {
            // toggle status/CompletedAt based on boolean
            if (req.IsCompleted.Value)
            {
                task.Status = "completed";
                task.CompletedAt = req.CompletedAt.HasValue ? DateTime.SpecifyKind(req.CompletedAt.Value, DateTimeKind.Utc) : DateTime.UtcNow;
            }
            else
            {
                task.Status = "pending";
                task.CompletedAt = null;
            }
        }
        if (req.NotesJson != null) task.NotesJson = req.NotesJson;
        
        await _db.SaveChangesAsync();
        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id, [FromQuery] string? deleteMode = null)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        
        // If task is part of a recurring series and deleteMode is "series", delete all
        if (task.RecurrenceId.HasValue && deleteMode == "series")
        {
            var relatedTasks = await _db.Tasks.Where(t => t.RecurrenceId == task.RecurrenceId.Value).ToListAsync();
            _db.Tasks.RemoveRange(relatedTasks);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Entire recurring series deleted", count = relatedTasks.Count });
        }
        else
        {
            // Delete only this task
            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Task deleted" });
        }
    }
}

public record CreateTaskRequest(
    int UserId,
    string Title,
    string? Category,
    string? Priority,
    DateTime? DueDate,
    bool Recurring = false,
    string Status = "pending",
    DateTime? RecurrenceStartDate = null,
    DateTime? RecurrenceEndDate = null,
    string[]? RecurrenceDays = null,
    int? RecurrenceId = null,
    int? RecurrenceInterval = null,
    string? RecurrenceUnit = null, // "days", "weeks", "months", "years"
    string? NotesJson = null
);

public record UpdateTaskRequest(
    string? Title,
    string? Category,
    string? Priority,
    DateTime? DueDate,
    bool? Recurring = null,
    string? Status = null,
    DateTime? RecurrenceStartDate = null,
    DateTime? RecurrenceEndDate = null,
    string[]? RecurrenceDays = null,
    int? RecurrenceId = null,
    int? RecurrenceInterval = null,
    string? RecurrenceUnit = null,
    DateTime? CompletedAt = null,
    bool? IsCompleted = null,
    string? NotesJson = null
);
