namespace GoodDaysApi.DTOs.Meal;

public class MealIngredientUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public int CaloriesKcal { get; set; }
    public double ProteinG { get; set; }
    public double CarbsG { get; set; }
    public double FatsG { get; set; }
    public double DefaultQty { get; set; } = 1;
    public string DefaultUnit { get; set; } = "unit";
}
