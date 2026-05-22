namespace GoodDaysApi.DTOs.Meal;

public class MealTemplateUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string Timing { get; set; } = "breakfast";
    public string? TimeOfDay { get; set; }
    public string IngredientsJson { get; set; } = "[]";
    public string Recipe { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
