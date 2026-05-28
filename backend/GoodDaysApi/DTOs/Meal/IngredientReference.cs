namespace GoodDaysApi.DTOs.Meal;

/// <summary>
/// Represents a reference to an ingredient within a meal's ingredients_json.
/// This can include an optional qty/unit override from the default ingredient values.
/// </summary>
public class IngredientReference
{
    /// <summary>
    /// The ingredient template ID from meal_ingredients table.
    /// </summary>
    public int IngredientId { get; set; }

    /// <summary>
    /// Optional quantity override. If not provided, uses ingredient's default_qty.
    /// </summary>
    public double? Qty { get; set; }

    /// <summary>
    /// Optional unit override. If not provided, uses ingredient's default_unit.
    /// </summary>
    public string? Unit { get; set; }
}
