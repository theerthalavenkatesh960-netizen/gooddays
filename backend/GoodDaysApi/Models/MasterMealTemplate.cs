namespace GoodDaysApi.Models;

/// <summary>
/// Shared master meal catalog. Rows are admin/seed-created and used as
/// a candidate pool for AI/normal meal plan generation in addition to
/// the user's own meal_templates. Macros and estimated cost are
/// denormalized from the ingredient snapshots at creation time.
/// </summary>
public class MasterMealTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Timing { get; set; } = "breakfast";
    public string? TimeOfDay { get; set; }
    public string IngredientsJson { get; set; } = "[]";
    public string Recipe { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int TotalCaloriesKcal { get; set; }
    public double TotalProteinG { get; set; }
    public double TotalCarbsG { get; set; }
    public double TotalFatsG { get; set; }
    public double EstimatedTotalCost { get; set; }
    /// <summary>Free-text hints for the AI planner, e.g. "Best eaten in the morning; pairs well with a protein shake".</summary>
    public string? PlannerNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
