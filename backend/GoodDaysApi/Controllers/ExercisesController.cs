using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExercisesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExercisesController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var exercises = await _db.Exercises
            .Where(e => e.UserId == null || e.UserId == userId)
            .OrderBy(e => e.MuscleGroup).ThenBy(e => e.Name)
            .ToListAsync();
        return Ok(exercises);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        var exercise = await _db.Exercises
            .FirstOrDefaultAsync(e => e.Id == id && (e.UserId == null || e.UserId == userId));
        return exercise is null ? NotFound() : Ok(exercise);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Exercise body)
    {
        var userId = GetUserId();
        body.UserId = userId;
        body.IsCustom = true;
        body.CreatedAt = DateTime.UtcNow;
        _db.Exercises.Add(body);
        await _db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Exercise body)
    {
        var userId = GetUserId();
        var exercise = await _db.Exercises.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exercise is null) return NotFound();
        exercise.Name = body.Name;
        exercise.MuscleGroup = body.MuscleGroup;
        exercise.Description = body.Description;
        exercise.ImageUrl = body.ImageUrl;
        await _db.SaveChangesAsync();
        return Ok(exercise);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var exercise = await _db.Exercises.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exercise is null) return NotFound();
        _db.Exercises.Remove(exercise);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
