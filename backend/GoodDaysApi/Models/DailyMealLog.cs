using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

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
    [Column("meal_ids_json", TypeName = "jsonb")]
    public JsonDocument MealIdsJson { get; set; } = JsonDocument.Parse("[]");
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
