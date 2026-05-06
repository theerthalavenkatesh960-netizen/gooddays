namespace GoodDaysApi.Models;

public class WorkoutDayImage
{
    public int Id { get; set; }
    public int WorkoutDayPlanId { get; set; }
    public WorkoutDayPlan WorkoutDayPlan { get; set; } = null!;
    public string ImageUrl { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
