namespace GoodDaysApi.Models;

public class WeeklyReview
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime WeekStartDate { get; set; } // Monday of the week

    // Auto-populated stats (stored for performance, computed when saving)
    public int TasksCompleted { get; set; }
    public int WorkoutDays { get; set; }
    public decimal StudyHours { get; set; }
    public int SelfCarePercent { get; set; }
    public int HabitsPercent { get; set; }
    public decimal MoodAvg { get; set; }
    public decimal TotalSpend { get; set; }

    // User reflections
    public string? Wins { get; set; }
    public string? Improvements { get; set; }
    public string? NextWeekFocus { get; set; }
    public string? Reflection { get; set; }

    // AI-generated content
    public string? AiSummary { get; set; }
    public string? AiPatternNoticed { get; set; }
    public string? AiNextFocus { get; set; }
    public bool AiGenerated { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
