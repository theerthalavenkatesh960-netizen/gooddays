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
    public async Task<IActionResult> GetUserTasks(Guid userId)
    {
        var tasks = await _db.Tasks.Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTask(Guid id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest req)
    {
        // if the client did not supply a RecurrenceId for a recurring task, generate one
        Guid? recurrenceId = req.Recurring ? (req.RecurrenceId ?? Guid.NewGuid()) : null;
        
        if (req.Recurring && req.RecurrenceStartDate.HasValue && req.RecurrenceEndDate.HasValue && req.RecurrenceInterval.HasValue && !string.IsNullOrEmpty(req.RecurrenceUnit))
        {
            // Generate multiple task instances based on recurrence pattern
            var tasks = GenerateRecurringTasks(
                req.UserId,
                req.Title,
                req.Category,
                req.Priority,
                req.RecurrenceStartDate.Value,
                req.RecurrenceEndDate.Value,
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
            // Create single task
            var task = new DailyTask
            {
                UserId = req.UserId,
                Title = req.Title,
                Category = req.Category,
                Priority = req.Priority,
                DueDate = req.DueDate,
                Recurring = req.Recurring,
                RecurrenceStartDate = req.RecurrenceStartDate,
                RecurrenceEndDate = req.RecurrenceEndDate,
                RecurrenceDays = req.RecurrenceDays,
                RecurrenceId = recurrenceId,
                RecurrenceInterval = req.RecurrenceInterval,
                RecurrenceUnit = req.RecurrenceUnit,
                Status = req.Status
            };
            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();
            return Ok(task);
        }
    }

    private List<DailyTask> GenerateRecurringTasks(
        Guid userId,
        string title,
        string? category,
        string? priority,
        DateTime startDate,
        DateTime endDate,
        int interval,
        string unit,
        string[]? recurrenceDays,
        Guid recurrenceId,
        string status)
    {
        var tasks = new List<DailyTask>();
        var currentDate = startDate.Date;
        
        while (currentDate <= endDate.Date)
        {
            // Check if this date matches the recurrence pattern
            bool shouldAdd = true;
            
            if (unit == "weeks" && recurrenceDays != null && recurrenceDays.Length > 0)
            {
                // Weekly: check if the day of week is in recurrenceDays
                var dayOfWeek = currentDate.DayOfWeek.ToString();
                shouldAdd = recurrenceDays.Contains(dayOfWeek);
            }
            else if (unit == "months" && recurrenceDays != null && recurrenceDays.Length > 0 && int.TryParse(recurrenceDays[0], out int dayOfMonth))
            {
                // Monthly: check if it's the specified day
                shouldAdd = currentDate.Day == dayOfMonth;
            }
            
            if (shouldAdd)
            {
                tasks.Add(new DailyTask
                {
                    UserId = userId,
                    Title = title,
                    Category = category,
                    Priority = priority,
                    DueDate = currentDate,
                    Recurring = true,
                    RecurrenceId = recurrenceId,
                    RecurrenceInterval = interval,
                    RecurrenceUnit = unit,
                    RecurrenceDays = recurrenceDays,
                    Status = status,
                    CreatedAt = DateTime.UtcNow
                });
            }
            
            // Move to next occurrence
            currentDate = unit switch
            {
                "days" => currentDate.AddDays(interval),
                "weeks" => currentDate.AddDays(7 * interval),
                "months" => currentDate.AddMonths(interval),
                "years" => currentDate.AddYears(interval),
                _ => currentDate.AddDays(1)
            };
        }
        
        return tasks;
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(Guid id, [FromBody] UpdateTaskRequest req)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        
        task.Title = req.Title ?? task.Title;
        task.Category = req.Category ?? task.Category;
        task.Priority = req.Priority ?? task.Priority;
        if (req.DueDate.HasValue) task.DueDate = req.DueDate.Value;
        if (req.Recurring.HasValue) task.Recurring = req.Recurring.Value;
        if (req.RecurrenceStartDate.HasValue) task.RecurrenceStartDate = req.RecurrenceStartDate.Value;
        if (req.RecurrenceEndDate.HasValue) task.RecurrenceEndDate = req.RecurrenceEndDate.Value;
        if (req.RecurrenceDays != null) task.RecurrenceDays = req.RecurrenceDays;
        if (req.RecurrenceId.HasValue) task.RecurrenceId = req.RecurrenceId;
        if (req.RecurrenceInterval.HasValue) task.RecurrenceInterval = req.RecurrenceInterval.Value;
        if (!string.IsNullOrEmpty(req.RecurrenceUnit)) task.RecurrenceUnit = req.RecurrenceUnit;
        task.Status = req.Status ?? task.Status;
        if (req.CompletedAt.HasValue) task.CompletedAt = req.CompletedAt;
        if (req.IsCompleted.HasValue)
        {
            // toggle status/CompletedAt based on boolean
            if (req.IsCompleted.Value)
            {
                task.Status = "completed";
                task.CompletedAt = req.CompletedAt ?? DateTime.UtcNow;
            }
            else
            {
                task.Status = "pending";
                task.CompletedAt = null;
            }
        }
        
        await _db.SaveChangesAsync();
        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(Guid id, [FromQuery] string? deleteMode = null)
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
    Guid UserId,
    string Title,
    string? Category,
    string? Priority,
    DateTime? DueDate,
    bool Recurring = false,
    string Status = "pending",
    DateTime? RecurrenceStartDate = null,
    DateTime? RecurrenceEndDate = null,
    string[]? RecurrenceDays = null,
    Guid? RecurrenceId = null,
    int? RecurrenceInterval = null,
    string? RecurrenceUnit = null // "days", "weeks", "months", "years"
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
    Guid? RecurrenceId = null,
    int? RecurrenceInterval = null,
    string? RecurrenceUnit = null,
    DateTime? CompletedAt = null,
    bool? IsCompleted = null
);
