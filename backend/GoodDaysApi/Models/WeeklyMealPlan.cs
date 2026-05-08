namespace GoodDaysApi.Models;

/// <summary>
/// Stores the weekly meal plan for a user as a JSON map.
/// PlanJson format: { "monday": [1, 3], "tuesday": [2], ... }  (arrays of MealTemplate IDs)
/// </summary>
public class WeeklyMealPlan
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string PlanJson { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
