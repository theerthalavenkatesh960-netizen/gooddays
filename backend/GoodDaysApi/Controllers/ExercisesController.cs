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

    public sealed class CreateExerciseRequest
    {
        public string Name { get; set; } = string.Empty;
        public string MuscleGroup { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? BeginnerTips { get; set; }
        public string? AnimationFrames { get; set; }
        public string? CommonMistakes { get; set; }
        public bool ShareWithOthers { get; set; }
    }

    public sealed class UpdateExerciseRequest
    {
        public string Name { get; set; } = string.Empty;
        public string MuscleGroup { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? BeginnerTips { get; set; }
        public string? AnimationFrames { get; set; }
        public string? CommonMistakes { get; set; }
        public bool? ShareWithOthers { get; set; }
    }

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
    public async Task<IActionResult> Create([FromBody] CreateExerciseRequest body)
    {
        var userId = GetUserId();
        var exercise = new Exercise
        {
            Name = body.Name,
            MuscleGroup = body.MuscleGroup,
            Description = body.Description,
            ImageUrl = body.ImageUrl,
            VideoUrl = body.VideoUrl,
            BeginnerTips = body.BeginnerTips,
            AnimationFrames = body.AnimationFrames,
            CommonMistakes = body.CommonMistakes,
            UserId = body.ShareWithOthers ? null : userId,
            IsCustom = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Exercises.Add(exercise);
        await _db.SaveChangesAsync();
        return Ok(exercise);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExerciseRequest body)
    {
        var userId = GetUserId();
        var exercise = await _db.Exercises.FirstOrDefaultAsync(e => e.Id == id && (e.UserId == null || e.UserId == userId));
        if (exercise is null) return NotFound();
        exercise.Name = body.Name;
        exercise.MuscleGroup = body.MuscleGroup;
        exercise.Description = body.Description;
        exercise.ImageUrl = body.ImageUrl;
        exercise.VideoUrl = body.VideoUrl;
        exercise.BeginnerTips = body.BeginnerTips;
        exercise.AnimationFrames = body.AnimationFrames;
        exercise.CommonMistakes = body.CommonMistakes;
        if (body.ShareWithOthers.HasValue)
        {
            exercise.UserId = body.ShareWithOthers.Value ? null : userId;
        }
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
