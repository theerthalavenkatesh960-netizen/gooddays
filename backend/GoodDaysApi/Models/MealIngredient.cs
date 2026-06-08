namespace GoodDaysApi.Models;

using System.ComponentModel.DataAnnotations.Schema;

public class MealIngredient
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CaloriesKcal { get; set; }
    public double ProteinG { get; set; }
    public double CarbsG { get; set; }
    public double FatsG { get; set; }
    public double DefaultQty { get; set; } = 1; // e.g., 1, 150, 0.5
    public string DefaultUnit { get; set; } = "unit"; // e.g., "egg", "tbsp", "g", "ml", "cup"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Optional pricing data for cost estimation
    [Column("price_per_100g")]
    public double? PricePer100g { get; set; }
    public double? ServingSizeG { get; set; }
}
