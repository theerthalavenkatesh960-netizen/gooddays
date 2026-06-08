namespace GoodDaysApi.DTOs.Meal;

/// <summary>
/// Meal template returned to the client with calculated total macros
/// based on ingredient quantities and portions.
/// </summary>
public class MealTemplateWithMacrosDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Timing { get; set; } = "breakfast";
    public string? TimeOfDay { get; set; }
    public string IngredientsJson { get; set; } = "[]";
    public string Recipe { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? MasterMealTemplateId { get; set; }

    // Calculated total macros for this meal (sum of all ingredients × their qty)
    public int TotalCaloriesKcal { get; set; }
    public double TotalProteinG { get; set; }
    public double TotalCarbsG { get; set; }
    public double TotalFatsG { get; set; }
}
