using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserProfilesController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly HashSet<string> AllowedTrackingOptions = new(StringComparer.OrdinalIgnoreCase)
    {
        "sleep_hours",
        "workout_minutes",
        "phone_minutes",
        "mood",
        "water",
    };

    public UserProfilesController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest req)
    {
        var user = new User { Email = req.Email, Name = req.Name, PasswordHash = req.PasswordHash ?? string.Empty };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name });
    }

    [Authorize]
    [HttpGet("me/settings")]
    public async Task<IActionResult> GetMySettings()
    {
        var userId = GetUserId();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        string[] trackingOptions;
        try
        {
            trackingOptions = JsonSerializer.Deserialize<string[]>(user.TrackingOptionsJson) ?? Array.Empty<string>();
        }
        catch
        {
            trackingOptions = Array.Empty<string>();
        }

        return Ok(new
        {
            theme = user.Theme,
            calorieGoal = user.CalorieGoal,
            trackingOptions,
        });
    }

    [Authorize]
    [HttpPut("me/settings")]
    public async Task<IActionResult> UpdateMySettings([FromBody] UpdateUserSettingsRequest req)
    {
        var userId = GetUserId();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Theme))
        {
            user.Theme = req.Theme.Trim();
        }

        if (req.CalorieGoal.HasValue)
        {
            var bounded = Math.Clamp(req.CalorieGoal.Value, 800, 6000);
            user.CalorieGoal = bounded;
        }

        if (req.TrackingOptions is not null)
        {
            var normalized = req.TrackingOptions
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Select(v => v.Trim())
                .Where(v => AllowedTrackingOptions.Contains(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            user.TrackingOptionsJson = JsonSerializer.Serialize(normalized);
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string[] trackingOptions;
        try
        {
            trackingOptions = JsonSerializer.Deserialize<string[]>(user.TrackingOptionsJson) ?? Array.Empty<string>();
        }
        catch
        {
            trackingOptions = Array.Empty<string>();
        }

        return Ok(new
        {
            theme = user.Theme,
            calorieGoal = user.CalorieGoal,
            trackingOptions,
        });
    }
}

public record CreateProfileRequest(string Email, string? Name, string? PasswordHash);
public record UpdateUserSettingsRequest(string? Theme, int? CalorieGoal, List<string>? TrackingOptions);
