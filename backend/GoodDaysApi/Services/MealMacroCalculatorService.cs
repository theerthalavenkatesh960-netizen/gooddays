using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Meal;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services;

/// <summary>
/// Service for calculating meal macros based on ingredient quantities.
/// Handles both new format { ingredientId, qty, unit } and legacy snapshot format { id, name, caloriesKcal, ... }.
/// </summary>
public class MealMacroCalculatorService
{
    private readonly AppDbContext _db;

    public MealMacroCalculatorService(AppDbContext db)
    {
        _db = db;
    }

    // Internal record covering both old and new ingredient formats
    private record ParsedEntry(
        int IngredientId, double Qty,
        double? InlineCal, double? InlineProt, double? InlineCarbs, double? InlineFats);

    private List<ParsedEntry> ParseAllFormats(string? json)
    {
        var result = new List<ParsedEntry>();
        if (string.IsNullOrWhiteSpace(json)) return result;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return result;
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.ValueKind != JsonValueKind.Object) continue;
                // Accept both "ingredientId" (new) and "id" (old snapshot format)
                int id = 0;
                if (el.TryGetProperty("ingredientId", out var newId))
                {
                    if (newId.ValueKind == JsonValueKind.Number) id = newId.GetInt32();
                    else if (newId.ValueKind == JsonValueKind.String) int.TryParse(newId.GetString(), out id);
                }
                else if (el.TryGetProperty("id", out var oldId))
                {
                    if (oldId.ValueKind == JsonValueKind.Number) id = oldId.GetInt32();
                    else if (oldId.ValueKind == JsonValueKind.String) int.TryParse(oldId.GetString(), out id);
                }
                double qty = 1;
                if (el.TryGetProperty("qty", out var qp))
                {
                    if (qp.ValueKind == JsonValueKind.Number) qty = qp.GetDouble();
                    else if (qp.ValueKind == JsonValueKind.String) double.TryParse(qp.GetString(), out qty);
                }
                // Old snapshot format stores pre-scaled macros directly
                double? cal = null, prot = null, carbs = null, fats = null;
                if (el.TryGetProperty("caloriesKcal", out var c) && c.ValueKind == JsonValueKind.Number) cal = c.GetDouble();
                if (el.TryGetProperty("proteinG", out var p) && p.ValueKind == JsonValueKind.Number) prot = p.GetDouble();
                if (el.TryGetProperty("carbsG", out var cb) && cb.ValueKind == JsonValueKind.Number) carbs = cb.GetDouble();
                if (el.TryGetProperty("fatsG", out var f) && f.ValueKind == JsonValueKind.Number) fats = f.GetDouble();
                // Skip only if we have neither a resolvable ID nor inline macros.
                if (id <= 0 && cal is null && prot is null && carbs is null && fats is null) continue;
                result.Add(new ParsedEntry(id, qty, cal, prot, carbs, fats));
            }
        }
        catch { }
        return result;
    }

    public List<IngredientReference> ParseIngredientsJson(string? json) =>
        ParseAllFormats(json).Select(p => new IngredientReference { IngredientId = p.IngredientId, Qty = p.Qty }).ToList();

    /// <summary>
    /// Calculate total macros. For new-format entries, looks up ingredient in DB and scales by qty.
    /// For old-format entries with inline macros, uses those directly (they were pre-scaled at save time).
    /// </summary>
    public async Task<(int calories, double protein, double carbs, double fats)> CalculateMealMacrosAsync(
        string? ingredientsJson)
    {
        var entries = ParseAllFormats(ingredientsJson);
        if (entries.Count == 0) return (0, 0, 0, 0);

        var idsToLookup = entries.Where(e => e.InlineCal == null).Select(e => e.IngredientId).Distinct().ToList();
        var ingredients = idsToLookup.Count > 0
            ? await _db.MealIngredients.Where(i => idsToLookup.Contains(i.Id)).ToDictionaryAsync(i => i.Id)
            : new Dictionary<int, MealIngredient>();

        double totalCal = 0, totalProt = 0, totalCarbs = 0, totalFats = 0;
        foreach (var e in entries)
        {
            if (ingredients.TryGetValue(e.IngredientId, out var ing))
            {
                // New format: scale DB macros by qty
                var qty = e.Qty > 0 ? e.Qty : ing.DefaultQty;
                totalCal += ing.CaloriesKcal * qty;
                totalProt += ing.ProteinG * qty;
                totalCarbs += ing.CarbsG * qty;
                totalFats += ing.FatsG * qty;
            }
            else if (e.InlineCal.HasValue)
            {
                // Old snapshot format: already scaled at save time, use directly
                totalCal += e.InlineCal.Value;
                totalProt += e.InlineProt ?? 0;
                totalCarbs += e.InlineCarbs ?? 0;
                totalFats += e.InlineFats ?? 0;
            }
        }
        return ((int)totalCal, totalProt, totalCarbs, totalFats);
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
