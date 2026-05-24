namespace GoodDaysApi.Models;

public class UserOnboarding
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    public string[] SelectedFeatures { get; set; } = Array.Empty<string>();

    public int? HeightCm { get; set; }
    public decimal? CurrentWeightKg { get; set; }
    public decimal? TargetWeightKg { get; set; }
    public DateOnly? TargetDate { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }

    public int? DailyCaloriesTarget { get; set; }
    public int? BudgetPerWeek { get; set; }
    public string? ActivityLevel { get; set; }
    public string? DietPreference { get; set; }

    public string[] PreferredWorkouts { get; set; } = Array.Empty<string>();
    public int? WorkoutsPerWeek { get; set; }
    public int? MinutesPerSession { get; set; }
    public string[] PreferredMeals { get; set; } = Array.Empty<string>();

    public int[] PreferredIngredientIds { get; set; } = Array.Empty<int>();
    public int[] ExcludedIngredientIds { get; set; } = Array.Empty<int>();
    public string GenerationMode { get; set; } = "ai";
    public int? PlanAdherenceScore { get; set; }

    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}