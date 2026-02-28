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
        var task = new DailyTask
        {
            UserId = req.UserId,
            Title = req.Title,
            Description = req.Description,
            DueDate = req.DueDate,
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return Ok(task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(Guid id, [FromBody] UpdateTaskRequest req)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        
        task.Title = req.Title ?? task.Title;
        task.Description = req.Description ?? task.Description;
        task.IsCompleted = req.IsCompleted ?? task.IsCompleted;
        task.DueDate = req.DueDate ?? task.DueDate;
        task.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateTaskRequest(Guid UserId, string Title, string? Description, DateTime DueDate);
public record UpdateTaskRequest(string? Title, string? Description, bool? IsCompleted, DateTime? DueDate);
