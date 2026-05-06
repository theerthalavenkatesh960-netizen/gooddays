namespace GoodDaysApi.Models;

/// <summary>
/// A planned workout for a specific date. Contains the list of exercises planned for that day.
/// PlannedExercises is JSON: [{ exerciseId, targetSets, targetReps, targetWeightKg, notes }]
/// </summary>
public class WorkoutDayPlan
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string? DayLabel { get; set; } // e.g. "Chest + Triceps"
    public int? SplitPresetId { get; set; }
    public string PlannedExercises { get; set; } = "[]"; // JSON array
    public bool IsCompleted { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkoutSet> Sets { get; set; } = new List<WorkoutSet>();
    public ICollection<WorkoutDayImage> Images { get; set; } = new List<WorkoutDayImage>();
}
