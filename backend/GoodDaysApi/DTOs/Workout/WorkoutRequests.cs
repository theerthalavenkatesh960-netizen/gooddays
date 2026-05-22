namespace GoodDaysApi.DTOs.Workout;

public class WorkoutSplitUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string DayConfigs { get; set; } = "{}";
    public bool IsActive { get; set; }
}

public class WorkoutDayPlanUpsertRequest
{
    public DateTime Date { get; set; }
    public string? DayLabel { get; set; }
    public string PlannedExercises { get; set; } = "[]";
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
}

public class WorkoutSetCreateRequest
{
    public int ExerciseId { get; set; }
    public int SetNumber { get; set; }
    public int? Reps { get; set; }
    public decimal? WeightKg { get; set; }
    public int? DurationSeconds { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
}

public class WorkoutSetUpdateRequest
{
    public int? Reps { get; set; }
    public decimal? WeightKg { get; set; }
    public int? DurationSeconds { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
}

public class WorkoutDayImageCreateRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public string? Caption { get; set; }
}
