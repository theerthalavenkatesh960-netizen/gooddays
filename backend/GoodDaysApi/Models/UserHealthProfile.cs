namespace GoodDaysApi.Models;

public class UserHealthProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? TargetWeightKg { get; set; }
    public int? DailyCaloriesTarget { get; set; }
    public string? DietPreference { get; set; }
    public decimal? BudgetPerWeek { get; set; }
    public string? ActivityLevel { get; set; }
    public string? MedicalConditions { get; set; }
    public DateOnly? TargetDate { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
