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
        int IngredientId,
        string Name,
        double Qty,
        double BaseQty,
        string BaseUnit,
        double? InlineCal,
        double? InlineProt,
        double? InlineCarbs,
        double? InlineFats);

    private static bool TryReadNumber(JsonElement element, out double value)
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            value = element.GetDouble();
            return true;
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            return double.TryParse(element.GetString(), out value);
        }

        value = 0;
        return false;
    }

    private static double Round2(double value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

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
                var name = string.Empty;
                if (el.TryGetProperty("name", out var nameProp) && nameProp.ValueKind == JsonValueKind.String)
                {
                    name = nameProp.GetString()?.Trim() ?? string.Empty;
                }

                double qty = 1;
                if (el.TryGetProperty("qty", out var qp))
                {
                    if (!TryReadNumber(qp, out qty)) qty = 1;
                }

                double baseQty = qty > 0 ? qty : 1;
                if (el.TryGetProperty("baseQty", out var bq) || el.TryGetProperty("defaultQty", out bq))
                {
                    if (!TryReadNumber(bq, out baseQty)) baseQty = qty > 0 ? qty : 1;
                }

                var baseUnit = "unit";
                if (el.TryGetProperty("baseUnit", out var bu) ||
                    el.TryGetProperty("unit", out bu) ||
                    el.TryGetProperty("defaultUnit", out bu))
                {
                    if (bu.ValueKind == JsonValueKind.String)
                    {
                        var unit = bu.GetString()?.Trim();
                        if (!string.IsNullOrWhiteSpace(unit)) baseUnit = unit;
                    }
                }

                // Old snapshot format stores pre-scaled macros directly
                double? cal = null, prot = null, carbs = null, fats = null;
                if (el.TryGetProperty("caloriesKcal", out var c) && TryReadNumber(c, out var calVal)) cal = calVal;
                if (el.TryGetProperty("proteinG", out var p) && TryReadNumber(p, out var protVal)) prot = protVal;
                if (el.TryGetProperty("carbsG", out var cb) && TryReadNumber(cb, out var carbsVal)) carbs = carbsVal;
                if (el.TryGetProperty("fatsG", out var f) && TryReadNumber(f, out var fatsVal)) fats = fatsVal;
                // Skip only if we have neither a resolvable ID nor inline macros.
                if (id <= 0 && cal is null && prot is null && carbs is null && fats is null) continue;
                result.Add(new ParsedEntry(id, name, qty, baseQty, baseUnit, cal, prot, carbs, fats));
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

        var idsToLookup = entries.Where(e => e.IngredientId > 0).Select(e => e.IngredientId).Distinct().ToList();
        var ingredients = idsToLookup.Count > 0
            ? await _db.MealIngredients.Where(i => idsToLookup.Contains(i.Id)).ToDictionaryAsync(i => i.Id)
            : new Dictionary<int, MealIngredient>();

        double totalCal = 0, totalProt = 0, totalCarbs = 0, totalFats = 0;
        foreach (var e in entries)
        {
            if (ingredients.TryGetValue(e.IngredientId, out var ing))
            {
                // Source-of-truth: scale DB macros by (qty / defaultQty)
                var defaultQty = Math.Max(0.01, ing.DefaultQty);
                var qty = e.Qty > 0 ? e.Qty : defaultQty;
                var factor = qty / defaultQty;
                totalCal += ing.CaloriesKcal * factor;
                totalProt += ing.ProteinG * factor;
                totalCarbs += ing.CarbsG * factor;
                totalFats += ing.FatsG * factor;
            }
            else if (e.InlineCal.HasValue)
            {
                // Legacy fallback: keep snapshot-compatible scaling.
                var baseQty = e.BaseQty > 0 ? e.BaseQty : (e.Qty > 0 ? e.Qty : 1);
                var qty = e.Qty > 0 ? e.Qty : baseQty;
                var factor = qty / Math.Max(0.01, baseQty);
                totalCal += (e.InlineCal ?? 0) * factor;
                totalProt += (e.InlineProt ?? 0) * factor;
                totalCarbs += (e.InlineCarbs ?? 0) * factor;
                totalFats += (e.InlineFats ?? 0) * factor;
            }
        }
        return ((int)totalCal, totalProt, totalCarbs, totalFats);
    }

    /// <summary>
    /// Canonicalize ingredient JSON so stored rows always contain computed macros
    /// derived from ingredient source-of-truth when resolvable by id.
    /// </summary>
    public async Task<string> CanonicalizeIngredientsJsonAsync(string? ingredientsJson)
    {
        var entries = ParseAllFormats(ingredientsJson);
        if (entries.Count == 0) return "[]";

        var ids = entries.Where(e => e.IngredientId > 0).Select(e => e.IngredientId).Distinct().ToList();
        var ingredients = ids.Count > 0
            ? await _db.MealIngredients.Where(i => ids.Contains(i.Id)).ToDictionaryAsync(i => i.Id)
            : new Dictionary<int, MealIngredient>();

        var result = new List<object>(entries.Count);
        foreach (var e in entries)
        {
            if (ingredients.TryGetValue(e.IngredientId, out var ing))
            {
                var defaultQty = Math.Max(0.01, ing.DefaultQty);
                var qty = e.Qty > 0 ? e.Qty : defaultQty;
                var factor = qty / defaultQty;

                result.Add(new
                {
                    ingredientId = ing.Id,
                    id = ing.Id,
                    name = ing.Name,
                    qty,
                    baseQty = defaultQty,
                    baseUnit = string.IsNullOrWhiteSpace(ing.DefaultUnit) ? "unit" : ing.DefaultUnit,
                    caloriesKcal = Round2(ing.CaloriesKcal * factor),
                    proteinG = Round2(ing.ProteinG * factor),
                    carbsG = Round2(ing.CarbsG * factor),
                    fatsG = Round2(ing.FatsG * factor),
                });
                continue;
            }

            var baseQtyFallback = e.BaseQty > 0 ? e.BaseQty : (e.Qty > 0 ? e.Qty : 1);
            var qtyFallback = e.Qty > 0 ? e.Qty : baseQtyFallback;
            var factorFallback = qtyFallback / Math.Max(0.01, baseQtyFallback);

            result.Add(new
            {
                ingredientId = e.IngredientId,
                id = e.IngredientId,
                name = e.Name,
                qty = qtyFallback,
                baseQty = baseQtyFallback,
                baseUnit = string.IsNullOrWhiteSpace(e.BaseUnit) ? "unit" : e.BaseUnit,
                caloriesKcal = Round2((e.InlineCal ?? 0) * factorFallback),
                proteinG = Round2((e.InlineProt ?? 0) * factorFallback),
                carbsG = Round2((e.InlineCarbs ?? 0) * factorFallback),
                fatsG = Round2((e.InlineFats ?? 0) * factorFallback),
            });
        }

        return JsonSerializer.Serialize(result);
    }

    /// <summary>
    /// Convert a MealTemplate to MealTemplateWithMacrosDto by calculating totals.
    /// </summary>
    public async Task<MealTemplateWithMacrosDto> ConvertToWithMacrosAsync(MealTemplate template)
    {
        var canonicalIngredientsJson = await CanonicalizeIngredientsJsonAsync(template.IngredientsJson);
        var (calories, protein, carbs, fats) = await CalculateMealMacrosAsync(canonicalIngredientsJson);

        return new MealTemplateWithMacrosDto
        {
            Id = template.Id,
            UserId = template.UserId,
            Name = template.Name,
            Timing = template.Timing,
            TimeOfDay = template.TimeOfDay,
            IngredientsJson = canonicalIngredientsJson,
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
