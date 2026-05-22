namespace GoodDaysApi.Models;

/// <summary>
/// A saved workout split preset (e.g. "PPL", "Push/Pull/Legs", "My Custom Split").
/// DayConfigs is stored as JSON: { "Monday": { "label": "Chest + Triceps", "exerciseIds": [1,2,3] }, ... }
/// </summary>
public class WorkoutSplitPreset
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "My PPL Split"
    public string DayConfigs { get; set; } = "{}"; // JSON
    public bool IsActive { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
