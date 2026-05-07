namespace GoodDaysApi.Models;

/// <summary>
/// A single logged set during a workout session.
/// </summary>
public class WorkoutSet
{
    public int Id { get; set; }
    public int WorkoutDayPlanId { get; set; }
    public WorkoutDayPlan WorkoutDayPlan { get; set; } = null!;
    public int ExerciseId { get; set; }
    public int SetNumber { get; set; }
    public int? Reps { get; set; }
    public decimal? WeightKg { get; set; }
    public int? DurationSeconds { get; set; } // for timed exercises like planks
    public bool IsCompleted { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
}
