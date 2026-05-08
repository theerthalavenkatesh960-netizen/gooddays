namespace GoodDaysApi.Models;

/// <summary>
/// Daily meal completion log for a user.
/// MealIdsJson stores a JSON array of meal template IDs logged for the day.
/// </summary>
public class DailyMealLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string MealIdsJson { get; set; } = "[]";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
