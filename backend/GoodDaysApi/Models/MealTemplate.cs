namespace GoodDaysApi.Models;

/// <summary>
/// A saved meal template. IngredientsJson stores a JSON array of
/// { "id": int, "name": string, "caloriesKcal": int, "proteinG": double, "carbsG": double, "fatsG": double }
/// representing the snapshot of each ingredient at time of saving.
/// </summary>
public class MealTemplate
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Timing { get; set; } = "breakfast"; // breakfast/lunch/dinner/pre-workout/post-workout/snack
    public string? TimeOfDay { get; set; }
    public string IngredientsJson { get; set; } = "[]"; // JSON array of ingredient snapshots
    public string Recipe { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
