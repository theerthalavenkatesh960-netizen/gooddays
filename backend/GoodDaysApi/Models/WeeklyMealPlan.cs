namespace GoodDaysApi.Models;

/// <summary>
/// Stores the weekly meal plan for a user as a JSON map.
/// PlanJson format: { "2026-05-13": [{ "mealTemplateId": 1, "timeOfDay": "06:30" }, ...], "2026-05-14": [...], ... }
/// Each date (yyyy-MM-dd format) maps to an ordered array of meal assignment objects.
/// - mealTemplateId (int): References MealTemplate.Id
/// - timeOfDay (string, nullable): Time override for this week (HH:MM format). If null, uses template's default time_of_day.
/// Example: { "2026-05-13": [{ "mealTemplateId": 1, "timeOfDay": "06:30" }, { "mealTemplateId": 3, "timeOfDay": "08:00" }] }
/// </summary>
public class WeeklyMealPlan
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string PlanJson { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
