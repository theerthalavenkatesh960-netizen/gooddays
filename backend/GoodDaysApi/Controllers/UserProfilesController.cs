using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

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

    private static readonly HashSet<string> AllowedDashboardPresets = new(StringComparer.OrdinalIgnoreCase)
    {
        "balanced",
        "discipline",
        "health-first",
        "wealth-first",
        "custom",
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
        DashboardWeightsDto dashboardWeights;
        try
        {
            trackingOptions = user.TrackingOptionsJson.RootElement.Deserialize<string[]>() ?? Array.Empty<string>();
        }
        catch
        {
            trackingOptions = Array.Empty<string>();
        }

        dashboardWeights = ParseDashboardWeights(user.DashboardWeightsJson);

        return Ok(new
        {
            theme = user.Theme,
            calorieGoal = user.CalorieGoal,
            trackingOptions,
            dashboardPreset = user.DashboardPreset,
            dashboardWeights,
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

            user.TrackingOptionsJson = JsonSerializer.SerializeToDocument(normalized);
        }

        if (!string.IsNullOrWhiteSpace(req.DashboardPreset))
        {
            var preset = req.DashboardPreset.Trim().ToLowerInvariant();
            if (!AllowedDashboardPresets.Contains(preset))
            {
                return BadRequest("Invalid dashboard preset.");
            }
            user.DashboardPreset = preset;
        }

        if (req.DashboardWeights is not null)
        {
            var normalizedWeights = NormalizeDashboardWeights(req.DashboardWeights);
            user.DashboardWeightsJson = JsonSerializer.SerializeToDocument(normalizedWeights);
            if (string.IsNullOrWhiteSpace(req.DashboardPreset))
            {
                user.DashboardPreset = "custom";
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string[] trackingOptions;
        DashboardWeightsDto dashboardWeights;
        try
        {
            trackingOptions = user.TrackingOptionsJson.RootElement.Deserialize<string[]>() ?? Array.Empty<string>();
        }
        catch
        {
            trackingOptions = Array.Empty<string>();
        }

        dashboardWeights = ParseDashboardWeights(user.DashboardWeightsJson);

        return Ok(new
        {
            theme = user.Theme,
            calorieGoal = user.CalorieGoal,
            trackingOptions,
            dashboardPreset = user.DashboardPreset,
            dashboardWeights,
        });
    }

    private static DashboardWeightsDto ParseDashboardWeights(JsonDocument? json)
    {
        try
        {
            if (json is null) return GetDefaultDashboardWeights();
            var parsed = json.RootElement.Deserialize<DashboardWeightsDto>();
            if (parsed is null) return GetDefaultDashboardWeights();
            return NormalizeDashboardWeights(parsed);
        }
        catch
        {
            return GetDefaultDashboardWeights();
        }
    }

    private static DashboardWeightsDto GetDefaultDashboardWeights()
    {
        return new DashboardWeightsDto(35, 20, 15, 15, 10, 5);
    }

    private static DashboardWeightsDto NormalizeDashboardWeights(DashboardWeightsDto input)
    {
        var tasks = Math.Clamp(input.Tasks, 0, 100);
        var routine = Math.Clamp(input.Routine, 0, 100);
        var body = Math.Clamp(input.Body, 0, 100);
        var workout = Math.Clamp(input.Workout, 0, 100);
        var finance = Math.Clamp(input.Finance, 0, 100);
        var journal = Math.Clamp(input.Journal, 0, 100);

        var total = tasks + routine + body + workout + finance + journal;
        if (total <= 0)
        {
            return GetDefaultDashboardWeights();
        }

        var scale = 100m / total;
        var nt = (int)Math.Round(tasks * scale, MidpointRounding.AwayFromZero);
        var nr = (int)Math.Round(routine * scale, MidpointRounding.AwayFromZero);
        var nb = (int)Math.Round(body * scale, MidpointRounding.AwayFromZero);
        var nw = (int)Math.Round(workout * scale, MidpointRounding.AwayFromZero);
        var nf = (int)Math.Round(finance * scale, MidpointRounding.AwayFromZero);
        var nj = 100 - nt - nr - nb - nw - nf;

        if (nj < 0)
        {
            nj = 0;
            nt = Math.Max(0, 100 - nr - nb - nw - nf - nj);
        }

        return new DashboardWeightsDto(nt, nr, nb, nw, nf, nj);
    }
}

public record CreateProfileRequest(string Email, string? Name, string? PasswordHash);

public class DashboardWeightsDto
{
    [JsonPropertyName("tasks")]
    public int Tasks { get; set; }

    [JsonPropertyName("routine")]
    public int Routine { get; set; }

    [JsonPropertyName("body")]
    public int Body { get; set; }

    [JsonPropertyName("workout")]
    public int Workout { get; set; }

    [JsonPropertyName("finance")]
    public int Finance { get; set; }

    [JsonPropertyName("journal")]
    public int Journal { get; set; }

    public DashboardWeightsDto() { }

    public DashboardWeightsDto(int tasks, int routine, int body, int workout, int finance, int journal)
    {
        Tasks = tasks;
        Routine = routine;
        Body = body;
        Workout = workout;
        Finance = finance;
        Journal = journal;
    }
}

public record UpdateUserSettingsRequest(
    string? Theme,
    int? CalorieGoal,
    List<string>? TrackingOptions,
    string? DashboardPreset,
    DashboardWeightsDto? DashboardWeights);
