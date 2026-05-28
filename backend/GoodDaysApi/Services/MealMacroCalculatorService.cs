using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Meal;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services;

/// <summary>
/// Service for calculating meal macros based on ingredient quantities,
/// parsing the new ingredients_json format with qty/unit support.
/// </summary>
public class MealMacroCalculatorService
{
    private readonly AppDbContext _db;

    public MealMacroCalculatorService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Parse ingredients_json string and return typed IngredientReference list.
    /// Handles errors gracefully, returning empty list on parse failure.
    /// </summary>
    public List<IngredientReference> ParseIngredientsJson(string? json)
    {
        var result = new List<IngredientReference>();
        if (string.IsNullOrWhiteSpace(json)) return result;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return result;

            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (element.ValueKind != JsonValueKind.Object) continue;

                var reference = new IngredientReference();

                if (element.TryGetProperty("ingredientId", out var idProp) && idProp.ValueKind == JsonValueKind.Number)
                {
                    reference.IngredientId = idProp.GetInt32();
                }
                else
                {
                    continue; // Skip if no ingredientId
                }

                if (element.TryGetProperty("qty", out var qtyProp) && qtyProp.ValueKind == JsonValueKind.Number)
                {
                    reference.Qty = qtyProp.GetDouble();
                }

                if (element.TryGetProperty("unit", out var unitProp) && unitProp.ValueKind == JsonValueKind.String)
                {
                    reference.Unit = unitProp.GetString();
                }

                result.Add(reference);
            }
        }
        catch
        {
            // Silently fail; return what we could parse
        }

        return result;
    }

    /// <summary>
    /// Calculate total macros for a meal template by:
    /// 1. Parsing ingredients_json to IngredientReference list
    /// 2. Looking up each ingredient from meal_ingredients table
    /// 3. Multiplying base macros by qty
    /// 4. Summing totals
    /// </summary>
    public async Task<(int calories, double protein, double carbs, double fats)> CalculateMealMacrosAsync(
        string? ingredientsJson)
    {
        var references = ParseIngredientsJson(ingredientsJson);
        if (references.Count == 0)
            return (0, 0, 0, 0);

        var ingredientIds = references
            .Select(r => r.IngredientId)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (ingredientIds.Count == 0)
            return (0, 0, 0, 0);

        var ingredients = await _db.MealIngredients
            .Where(i => ingredientIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, i => i);

        var totalCalories = 0;
        var totalProtein = 0.0;
        var totalCarbs = 0.0;
        var totalFats = 0.0;

        foreach (var reference in references)
        {
            if (!ingredients.TryGetValue(reference.IngredientId, out var ingredient))
                continue;

            // Use override qty/unit if provided, else use ingredient defaults
            var qty = reference.Qty ?? ingredient.DefaultQty;

            // Macros are scaled by qty (e.g., 2 eggs = 2x single egg's macros)
            totalCalories += (int)(ingredient.CaloriesKcal * qty);
            totalProtein += ingredient.ProteinG * qty;
            totalCarbs += ingredient.CarbsG * qty;
            totalFats += ingredient.FatsG * qty;
        }

        return (totalCalories, totalProtein, totalCarbs, totalFats);
    }

    /// <summary>
    /// Convert a MealTemplate to MealTemplateWithMacrosDto by calculating totals.
    /// </summary>
    public async Task<MealTemplateWithMacrosDto> ConvertToWithMacrosAsync(MealTemplate template)
    {
        var (calories, protein, carbs, fats) = await CalculateMealMacrosAsync(template.IngredientsJson);

        return new MealTemplateWithMacrosDto
        {
            Id = template.Id,
            UserId = template.UserId,
            Name = template.Name,
            Timing = template.Timing,
            TimeOfDay = template.TimeOfDay,
            IngredientsJson = template.IngredientsJson,
            Recipe = template.Recipe,
            ImageUrl = template.ImageUrl,
            CreatedAt = template.CreatedAt,
            MasterMealTemplateId = template.MasterMealTemplateId,
            TotalCaloriesKcal = calories,
            TotalProteinG = protein,
            TotalCarbsG = carbs,
            TotalFatsG = fats,
        };
    }

    /// <summary>
    /// Batch convert multiple templates to WithMacrosDto objects.
    /// </summary>
    public async Task<List<MealTemplateWithMacrosDto>> ConvertManyToWithMacrosAsync(
        IEnumerable<MealTemplate> templates)
    {
        var result = new List<MealTemplateWithMacrosDto>();
        foreach (var template in templates)
        {
            result.Add(await ConvertToWithMacrosAsync(template));
        }
        return result;
    }
}
