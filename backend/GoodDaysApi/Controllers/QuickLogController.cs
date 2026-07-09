using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuickLogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public QuickLogController(AppDbContext db, IWebHostEnvironment env, IConfiguration config)
    {
        _db = db;
        _env = env;
        _config = config;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ─── Log Quick Entry ──────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> LogQuickEntry([FromBody] LogQuickEntryRequest body)
    {
        if (string.IsNullOrWhiteSpace(body?.Type))
            return BadRequest(new { error = "Type is required" });

        var validTypes = new[] { "workout", "meal", "expense", "water", "task" };
        if (!validTypes.Contains(body.Type))
            return BadRequest(new { error = $"Type must be one of: {string.Join(", ", validTypes)}" });

        if (body.Payload is null)
            return BadRequest(new { error = "Payload is required" });

        var userId = GetUserId();
        var date = DateOnly.TryParse(body.Date, out var parsedDate) 
            ? parsedDate 
            : DateOnly.FromDateTime(DateTime.Now);

        var entry = new QuickLogEntry
        {
            UserId = userId,
            Date = date,
            Type = body.Type,
            PayloadJson = JsonSerializer.SerializeToDocument(body.Payload),
            CreatedAt = DateTime.UtcNow
        };

        _db.QuickLogEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = entry.Id,
            date = entry.Date.ToString("yyyy-MM-dd"),
            type = entry.Type,
            payload = body.Payload,
            createdAt = entry.CreatedAt.ToIso8601String()
        });
    }

    // ─── Get Quick Log History ────────────────────────────────────────────

    [HttpGet("history")]
    public async Task<IActionResult> GetQuickLogHistory(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? type)
    {
        if (string.IsNullOrWhiteSpace(from) || !DateOnly.TryParse(from, out var fromDate))
            return BadRequest(new { error = "Invalid 'from' date. Use yyyy-MM-dd" });

        if (string.IsNullOrWhiteSpace(to) || !DateOnly.TryParse(to, out var toDate))
            return BadRequest(new { error = "Invalid 'to' date. Use yyyy-MM-dd" });

        var userId = GetUserId();
        var query = _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Date >= fromDate && e.Date <= toDate);

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(e => e.Type == type);
        }

        var entries = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return Ok(entries.Select(e => new
        {
            id = e.Id,
            date = e.Date.ToString("yyyy-MM-dd"),
            type = e.Type,
            payload = e.PayloadJson.RootElement.Clone(),
            createdAt = e.CreatedAt.ToIso8601String()
        }));
    }

    // ─── Meal Twins ────────────────────────────────────────────────────────

    [HttpGet("meal/twins")]
    public async Task<IActionResult> GetMealTwins([FromQuery] int limit = 8, [FromQuery] int lookbackDays = 45)
    {
        var userId = GetUserId();
        limit = Math.Clamp(limit, 1, 20);
        lookbackDays = Math.Clamp(lookbackDays, 7, 120);
        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-lookbackDays));

        var entries = await _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Type == "meal" && e.Date >= fromDate)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var grouped = entries
            .Select(e =>
            {
                var payload = QuickLogPayloadHelpers.ToDictionary(e.PayloadJson);
                var label = QuickLogPayloadHelpers.InferMealLabel(payload);
                return new { Entry = e, Payload = payload, Label = label, Normalized = QuickLogPayloadHelpers.NormalizeMealLabel(label) };
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Normalized))
            .GroupBy(x => x.Normalized)
            .Select(g =>
            {
                var latest = g.OrderByDescending(x => x.Entry.CreatedAt).First();
                return new
                {
                    key = g.Key,
                    label = latest.Label,
                    count = g.Count(),
                    lastDate = latest.Entry.Date.ToString("yyyy-MM-dd"),
                    quickLogId = latest.Entry.Id,
                    payload = latest.Payload,
                };
            })
            .OrderByDescending(x => x.count)
            .ThenByDescending(x => x.lastDate)
            .Take(limit)
            .ToList();

        return Ok(grouped);
    }

    // ─── Meal Estimate ─────────────────────────────────────────────────────

    [HttpPost("meal/estimate")]
    public async Task<IActionResult> EstimateMeal([FromBody] MealEstimateRequest body)
    {
        var text = body?.CaptureText?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest(new { error = "captureText is required" });

        var userId = GetUserId();
        var lookbackDays = Math.Clamp(body?.LookbackDays ?? 90, 14, 180);
        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-lookbackDays));

        var historyEntries = await _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Type == "meal" && e.Date >= fromDate)
            .OrderByDescending(e => e.CreatedAt)
            .Take(300)
            .ToListAsync();

        var templateIds = historyEntries
            .SelectMany(entry =>
            {
                var payload = QuickLogPayloadHelpers.ToDictionary(entry.PayloadJson);
                var ids = QuickLogPayloadHelpers.GetIntArray(payload, "mealIds").ToList();
                var singleId = QuickLogPayloadHelpers.GetInt(payload, "mealId");
                if (singleId is not null) ids.Add(singleId.Value);
                return ids;
            })
            .Distinct()
            .ToList();

        var templateMacroMap = (await _db.MealTemplates
            .Where(t => t.UserId == userId && templateIds.Contains(t.Id))
            .ToListAsync())
            .ToDictionary(
                t => t.Id,
                t => MealEstimateHeuristics.ParseTemplateMacros(t.IngredientsJson)
            );

        var samples = new List<MealMacroSample>();
        var recencyRank = 0;
        foreach (var entry in historyEntries)
        {
            var payload = QuickLogPayloadHelpers.ToDictionary(entry.PayloadJson);
            var label = QuickLogPayloadHelpers.InferMealLabel(payload);
            if (string.IsNullOrWhiteSpace(label)) continue;

            MealMacroEstimate? macros = null;
            if (QuickLogPayloadHelpers.TryGetMacros(payload, out var directMacros))
            {
                macros = directMacros;
            }
            else
            {
                var mealIds = QuickLogPayloadHelpers.GetIntArray(payload, "mealIds").ToList();
                var singleMealId = QuickLogPayloadHelpers.GetInt(payload, "mealId");
                if (singleMealId is not null) mealIds.Add(singleMealId.Value);

                var aggregate = MealEstimateHeuristics.AggregateTemplateMacros(mealIds, templateMacroMap);
                if (aggregate is not null)
                {
                    macros = aggregate;
                }
            }

            if (macros is null) continue;
            var macro = macros.Value;

            var confidenceHint = QuickLogPayloadHelpers.GetString(payload, "confidence")?.ToLowerInvariant();
            var sourceWeight = confidenceHint == "high" ? 1.12 : confidenceHint == "low" ? 0.92 : 1.0;

            samples.Add(new MealMacroSample
            {
                Label = label,
                NormalizedLabel = QuickLogPayloadHelpers.NormalizeMealLabel(label),
                Date = entry.Date,
                RecencyRank = recencyRank++,
                Calories = macro.Calories,
                ProteinG = macro.ProteinG,
                CarbsG = macro.CarbsG,
                FatsG = macro.FatsG,
                SourceWeight = sourceWeight,
            });
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var deltaCommand = MealEstimateHeuristics.ParseDeltaCommand(text);
        var estimate = MealEstimateHeuristics.EstimateWithHistory(text, today, samples, deltaCommand);
        var allowDebug = _env.IsDevelopment() || _config.GetValue<bool>("Ai:EnableMealEstimateDebug");
        var includeDebug = allowDebug && body?.IncludeDebug == true;

        if (includeDebug)
        {
            return Ok(new
            {
                captureText = text,
                estimateStatus = "estimated",
                confidence = estimate.Confidence,
                calories = estimate.Calories,
                proteinG = estimate.ProteinG,
                carbsG = estimate.CarbsG,
                fatsG = estimate.FatsG,
                assumptions = estimate.Assumptions,
                debug = new
                {
                    topMatches = estimate.TopMatches,
                    adaptiveTuning = estimate.Tuning,
                    usedDeltaClone = estimate.UsedDeltaClone,
                    deltaBaseLabel = estimate.DeltaBaseLabel,
                    sampleCount = samples.Count,
                }
            });
        }

        return Ok(new
        {
            captureText = text,
            estimateStatus = "estimated",
            confidence = estimate.Confidence,
            calories = estimate.Calories,
            proteinG = estimate.ProteinG,
            carbsG = estimate.CarbsG,
            fatsG = estimate.FatsG,
            assumptions = estimate.Assumptions,
        });
    }

    // ─── Needs Review Queue ────────────────────────────────────────────────

    [HttpGet("meal/review")]
    public async Task<IActionResult> GetMealReviewQueue([FromQuery] string? from, [FromQuery] string? to)
    {
        var userId = GetUserId();
        var toDate = DateOnly.TryParse(to, out var parsedTo)
            ? parsedTo
            : DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = DateOnly.TryParse(from, out var parsedFrom)
            ? parsedFrom
            : toDate.AddDays(-14);

        var entries = await _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Type == "meal" && e.Date >= fromDate && e.Date <= toDate)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var unresolved = entries
            .Select(e =>
            {
                var payload = QuickLogPayloadHelpers.ToDictionary(e.PayloadJson);
                var needsReview = QuickLogPayloadHelpers.GetBool(payload, "needsReview");
                var confidence = QuickLogPayloadHelpers.GetString(payload, "confidence");
                var estimateStatus = QuickLogPayloadHelpers.GetString(payload, "estimateStatus");
                var label = QuickLogPayloadHelpers.InferMealLabel(payload);
                return new
                {
                    entry = e,
                    payload,
                    needsReview,
                    confidence,
                    estimateStatus,
                    label,
                };
            })
            .Where(x => x.needsReview || x.confidence == "low" || x.estimateStatus == "pending")
            .Select(x => new
            {
                id = x.entry.Id,
                date = x.entry.Date.ToString("yyyy-MM-dd"),
                type = x.entry.Type,
                mealLabel = x.label,
                estimateStatus = x.estimateStatus,
                confidence = x.confidence,
                payload = x.payload,
                createdAt = x.entry.CreatedAt.ToIso8601String(),
            })
            .ToList();

        return Ok(unresolved);
    }

    [HttpPut("meal/review/{id:int}")]
    public async Task<IActionResult> ResolveMealReview(int id, [FromBody] MealReviewUpdateRequest body)
    {
        var userId = GetUserId();
        var entry = await _db.QuickLogEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && e.Type == "meal");

        if (entry is null)
            return NotFound(new { error = "Meal quick log not found" });

        var payload = QuickLogPayloadHelpers.ToDictionary(entry.PayloadJson);
        payload["needsReview"] = false;
        payload["estimateStatus"] = string.IsNullOrWhiteSpace(body?.EstimateStatus) ? "manual" : body!.EstimateStatus!;
        payload["confidence"] = string.IsNullOrWhiteSpace(body?.Confidence) ? "high" : body!.Confidence!;

        if (body is not null)
        {
            if (body.Calories is not null) payload["calories"] = body.Calories.Value;
            if (body.ProteinG is not null) payload["proteinG"] = body.ProteinG.Value;
            if (body.CarbsG is not null) payload["carbsG"] = body.CarbsG.Value;
            if (body.FatsG is not null) payload["fatsG"] = body.FatsG.Value;
            if (!string.IsNullOrWhiteSpace(body.CaptureText)) payload["captureText"] = body.CaptureText;
        }

        entry.PayloadJson = JsonSerializer.SerializeToDocument(payload);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = entry.Id,
            date = entry.Date.ToString("yyyy-MM-dd"),
            type = entry.Type,
            payload,
            createdAt = entry.CreatedAt.ToIso8601String(),
        });
    }

    // ─── Get Today's Quick Logs ────────────────────────────────────────────

    [HttpGet("today")]
    public async Task<IActionResult> GetTodayQuickLogs()
    {
        var userId = GetUserId();
        var today = DateOnly.FromDateTime(DateTime.Now);

        var entries = await _db.QuickLogEntries
            .Where(e => e.UserId == userId && e.Date == today)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return Ok(entries.Select(e => new
        {
            id = e.Id,
            date = e.Date.ToString("yyyy-MM-dd"),
            type = e.Type,
            payload = e.PayloadJson.RootElement.Clone(),
            createdAt = e.CreatedAt.ToIso8601String()
        }));
    }

    // ─── Delete Quick Log Entry ────────────────────────────────────────────

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuickLogEntry(int id)
    {
        var userId = GetUserId();
        var entry = await _db.QuickLogEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (entry is null)
            return NotFound(new { error = "Quick log entry not found" });

        _db.QuickLogEntries.Remove(entry);
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────

public class LogQuickEntryRequest
{
    public string? Type { get; set; }
    public Dictionary<string, object>? Payload { get; set; }
    public string? Date { get; set; }
}

public class MealEstimateRequest
{
    public string? CaptureText { get; set; }
    public int? LookbackDays { get; set; }
    public bool? IncludeDebug { get; set; }
}

public class MealReviewUpdateRequest
{
    public string? CaptureText { get; set; }
    public double? Calories { get; set; }
    public double? ProteinG { get; set; }
    public double? CarbsG { get; set; }
    public double? FatsG { get; set; }
    public string? EstimateStatus { get; set; }
    public string? Confidence { get; set; }
}

file static class MealEstimateHeuristics
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "with", "and", "of", "to", "for", "same", "as", "yesterday", "today", "meal"
    };

    public static MealEstimateComputation EstimateWithHistory(
        string input,
        DateOnly today,
        IReadOnlyList<MealMacroSample> samples,
        DeltaCommand? deltaCommand)
    {
        var fallback = EstimateFromText(input);
        var tuning = BuildAdaptiveTuning(samples);

        if (deltaCommand is not null)
        {
            var deltaClone = TryBuildDeltaCloneEstimate(deltaCommand, today, samples, tuning);
            if (deltaClone is not null)
            {
                return deltaClone;
            }
        }

        if (samples.Count == 0)
        {
            return new MealEstimateComputation
            {
                Calories = fallback.calories,
                ProteinG = fallback.proteinG,
                CarbsG = fallback.carbsG,
                FatsG = fallback.fatsG,
                Confidence = fallback.confidence,
                Assumptions = fallback.assumptions,
                Tuning = tuning,
                TopMatches = Array.Empty<MealEstimateDebugMatch>(),
            };
        }

        var normalizedInput = Normalize(input);
        var inputTokens = Tokenize(normalizedInput);
        var weightedMatches = new List<(MealMacroSample sample, double score, double weight)>();

        foreach (var sample in samples)
        {
            if (string.IsNullOrWhiteSpace(sample.NormalizedLabel)) continue;

            var score = Similarity(normalizedInput, inputTokens, sample.NormalizedLabel);
            if (score < tuning.MinimumSimilarityCutoff) continue;

            var days = Math.Max(0, today.DayNumber - sample.Date.DayNumber);
            var recencyWeight = 1.0 / (1.0 + (days / 28.0));
            var weight = score * recencyWeight * sample.SourceWeight;
            if (weight <= 0) continue;

            weightedMatches.Add((sample, score, weight));
        }

        if (weightedMatches.Count == 0)
        {
            return new MealEstimateComputation
            {
                Calories = fallback.calories,
                ProteinG = fallback.proteinG,
                CarbsG = fallback.carbsG,
                FatsG = fallback.fatsG,
                Confidence = fallback.confidence,
                Assumptions = fallback.assumptions,
                Tuning = tuning,
                TopMatches = Array.Empty<MealEstimateDebugMatch>(),
            };
        }

        var totalWeight = weightedMatches.Sum(m => m.weight);
        var histCalories = weightedMatches.Sum(m => m.sample.Calories * m.weight) / totalWeight;
        var histProtein = weightedMatches.Sum(m => m.sample.ProteinG * m.weight) / totalWeight;
        var histCarbs = weightedMatches.Sum(m => m.sample.CarbsG * m.weight) / totalWeight;
        var histFats = weightedMatches.Sum(m => m.sample.FatsG * m.weight) / totalWeight;

        var blend = Math.Clamp(totalWeight / tuning.BlendDivisor, tuning.BlendMin, tuning.BlendMax);
        var calories = (fallback.calories * (1 - blend)) + (histCalories * blend);
        var protein = (fallback.proteinG * (1 - blend)) + (histProtein * blend);
        var carbs = (fallback.carbsG * (1 - blend)) + (histCarbs * blend);
        var fats = (fallback.fatsG * (1 - blend)) + (histFats * blend);

        var topScore = weightedMatches.Max(m => m.score);
        var contributing = weightedMatches.Count;
        var confidence = topScore >= tuning.HighConfidenceCutoff && contributing >= 2
            ? "high"
            : (topScore >= tuning.MediumConfidenceCutoff ? "medium" : fallback.confidence);

        var topLabels = weightedMatches
            .OrderByDescending(m => m.score)
            .Take(3)
            .Select(m => m.sample.Label)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var assumptions = fallback.assumptions.ToList();
        assumptions.Add($"personalized estimate from {contributing} similar meal logs");
        if (topLabels.Length > 0)
        {
            assumptions.Add($"closest matches: {string.Join(", ", topLabels)}");
        }

        var debugMatches = weightedMatches
            .OrderByDescending(m => m.score)
            .Take(5)
            .Select(m => new MealEstimateDebugMatch
            {
                Label = m.sample.Label,
                Score = Math.Round(m.score, 3),
                Weight = Math.Round(m.weight, 3),
                Date = m.sample.Date.ToString("yyyy-MM-dd"),
                Calories = Math.Round(m.sample.Calories),
                ProteinG = Math.Round(m.sample.ProteinG),
                CarbsG = Math.Round(m.sample.CarbsG),
                FatsG = Math.Round(m.sample.FatsG),
            })
            .ToArray();

        return new MealEstimateComputation
        {
            Calories = Math.Round(calories),
            ProteinG = Math.Round(protein),
            CarbsG = Math.Round(carbs),
            FatsG = Math.Round(fats),
            Confidence = confidence,
            Assumptions = assumptions.ToArray(),
            Tuning = tuning,
            TopMatches = debugMatches,
            UsedDeltaClone = false,
        };
    }

    public static DeltaCommand? ParseDeltaCommand(string input)
    {
        var trimmed = (input ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return null;

        var yesterday = Regex.Match(trimmed, "^same as yesterday(?:\\s*(.*))?$", RegexOptions.IgnoreCase);
        if (yesterday.Success)
        {
            return new DeltaCommand
            {
                DaysBack = 1,
                Modifier = (yesterday.Groups[1].Value ?? string.Empty).Trim(),
                Raw = trimmed,
            };
        }

        var daysAgo = Regex.Match(trimmed, "^same as (\\d+)\\s*days?\\s*ago(?:\\s*(.*))?$", RegexOptions.IgnoreCase);
        if (daysAgo.Success && int.TryParse(daysAgo.Groups[1].Value, out var days) && days > 0)
        {
            return new DeltaCommand
            {
                DaysBack = Math.Min(days, 14),
                Modifier = (daysAgo.Groups[2].Value ?? string.Empty).Trim(),
                Raw = trimmed,
            };
        }

        return null;
    }

    public static MealMacroEstimate ParseTemplateMacros(string ingredientsJson)
    {
        if (string.IsNullOrWhiteSpace(ingredientsJson))
        {
            return new MealMacroEstimate(0, 0, 0, 0);
        }

        try
        {
            using var doc = JsonDocument.Parse(ingredientsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
            {
                return new MealMacroEstimate(0, 0, 0, 0);
            }

            double calories = 0;
            double protein = 0;
            double carbs = 0;
            double fats = 0;

            foreach (var item in doc.RootElement.EnumerateArray())
            {
                calories += ReadDouble(item, "caloriesKcal");
                protein += ReadDouble(item, "proteinG");
                carbs += ReadDouble(item, "carbsG");
                fats += ReadDouble(item, "fatsG");
            }

            return new MealMacroEstimate(calories, protein, carbs, fats);
        }
        catch
        {
            return new MealMacroEstimate(0, 0, 0, 0);
        }
    }

    public static MealMacroEstimate? AggregateTemplateMacros(IEnumerable<int> ids, IReadOnlyDictionary<int, MealMacroEstimate> map)
    {
        var any = false;
        double calories = 0;
        double protein = 0;
        double carbs = 0;
        double fats = 0;

        foreach (var id in ids.Distinct())
        {
            if (!map.TryGetValue(id, out var macro)) continue;
            any = true;
            calories += macro.Calories;
            protein += macro.ProteinG;
            carbs += macro.CarbsG;
            fats += macro.FatsG;
        }

        return any ? new MealMacroEstimate(calories, protein, carbs, fats) : null;
    }

    public static (double calories, double proteinG, double carbsG, double fatsG, string confidence, string[] assumptions) EstimateFromText(string input)
    {
        var normalized = input.ToLowerInvariant();
        var assumptions = new List<string>();
        double calories = 220;
        double protein = 10;
        double carbs = 18;
        double fats = 10;

        if (normalized.Contains("rice"))
        {
            calories += 210;
            carbs += 45;
            protein += 4;
            assumptions.Add("rice portion assumed as one medium serving");
        }
        if (normalized.Contains("roti") || normalized.Contains("chapati"))
        {
            calories += 120;
            carbs += 20;
            protein += 3;
            assumptions.Add("one roti portion assumed unless quantity mentioned");
        }
        if (normalized.Contains("curry") || normalized.Contains("gravy"))
        {
            calories += 160;
            fats += 8;
            assumptions.Add("curry includes oil and sauce base");
        }
        if (normalized.Contains("chicken") || normalized.Contains("egg") || normalized.Contains("paneer") || normalized.Contains("tofu"))
        {
            calories += 180;
            protein += 22;
            fats += 6;
            assumptions.Add("protein serving assumed as one palm-sized portion");
        }

        var qtyMatches = System.Text.RegularExpressions.Regex.Matches(normalized, @"(\d+(?:\.\d+)?)");
        if (qtyMatches.Count > 0)
        {
            var qty = qtyMatches
                .Select(m => double.TryParse(m.Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : 1)
                .DefaultIfEmpty(1)
                .Max();
            if (qty > 1)
            {
                var factor = Math.Min(qty, 3);
                calories *= factor;
                protein *= factor;
                carbs *= factor;
                fats *= factor;
                assumptions.Add($"quantity scaling applied with factor {factor:0.##}");
            }
        }

        var hasStrongSignals = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length >= 4;
        var confidence = hasStrongSignals ? "medium" : "low";

        return (
            Math.Round(calories),
            Math.Round(protein),
            Math.Round(carbs),
            Math.Round(fats),
            confidence,
            assumptions.ToArray());
    }

    private static string Normalize(string value)
        => Regex.Replace((value ?? string.Empty).ToLowerInvariant(), "[^a-z0-9\\s]", " ").Trim();

    private static HashSet<string> Tokenize(string normalized)
        => normalized
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => !StopWords.Contains(t))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static double Similarity(string normalizedInput, HashSet<string> inputTokens, string sampleLabel)
    {
        var sampleTokens = Tokenize(sampleLabel);
        if (inputTokens.Count == 0 || sampleTokens.Count == 0)
        {
            return normalizedInput == sampleLabel ? 1.0 : 0.0;
        }

        var overlap = inputTokens.Count(t => sampleTokens.Contains(t));
        var union = inputTokens.Count + sampleTokens.Count - overlap;
        var jaccard = union == 0 ? 0 : (double)overlap / union;

        var containsBoost = sampleLabel.Contains(normalizedInput, StringComparison.OrdinalIgnoreCase)
            || normalizedInput.Contains(sampleLabel, StringComparison.OrdinalIgnoreCase)
                ? 0.22
                : 0;

        return Math.Clamp(jaccard + containsBoost, 0, 1);
    }

    private static double ReadDouble(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var val)) return 0;
        if (val.ValueKind == JsonValueKind.Number)
        {
            return val.TryGetDouble(out var d) ? d : 0;
        }
        if (val.ValueKind == JsonValueKind.String)
        {
            return double.TryParse(val.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : 0;
        }
        return 0;
    }

    private static AdaptiveTuningConfig BuildAdaptiveTuning(IReadOnlyList<MealMacroSample> samples)
    {
        var baseConfig = new AdaptiveTuningConfig
        {
            MinimumSimilarityCutoff = 0.14,
            MediumConfidenceCutoff = 0.34,
            HighConfidenceCutoff = 0.68,
            BlendDivisor = 2.2,
            BlendMin = 0.35,
            BlendMax = 0.86,
            MatureProfile = false,
            SampleCount = samples.Count,
            ActiveDays = samples.Select(s => s.Date).Distinct().Count(),
        };

        if (samples.Count < 20 || baseConfig.ActiveDays < 3)
        {
            return baseConfig;
        }

        var diversity = samples.Select(s => s.NormalizedLabel).Distinct().Count() / (double)Math.Max(1, samples.Count);
        baseConfig.MatureProfile = true;
        baseConfig.MinimumSimilarityCutoff = Math.Clamp(0.12 + (diversity * 0.03), 0.12, 0.2);
        baseConfig.MediumConfidenceCutoff = Math.Clamp(0.3 + (diversity * 0.07), 0.3, 0.45);
        baseConfig.HighConfidenceCutoff = Math.Clamp(0.6 + (diversity * 0.12), 0.6, 0.78);
        baseConfig.BlendDivisor = Math.Clamp(2.5 - (samples.Count / 250.0), 1.8, 2.5);
        baseConfig.BlendMin = 0.38;
        baseConfig.BlendMax = 0.9;

        return baseConfig;
    }

    private static MealEstimateComputation? TryBuildDeltaCloneEstimate(
        DeltaCommand delta,
        DateOnly today,
        IReadOnlyList<MealMacroSample> samples,
        AdaptiveTuningConfig tuning)
    {
        var targetDate = today.AddDays(-delta.DaysBack);
        var daySamples = samples.Where(s => s.Date == targetDate).ToList();
        if (daySamples.Count == 0)
        {
            return null;
        }

        MealMacroSample? baseline;
        if (string.IsNullOrWhiteSpace(delta.Modifier))
        {
            baseline = daySamples.OrderBy(s => s.RecencyRank).FirstOrDefault();
        }
        else
        {
            var modifierNormalized = Normalize(delta.Modifier);
            var modifierTokens = Tokenize(modifierNormalized);
            baseline = daySamples
                .Select(s => new { Sample = s, Score = Similarity(modifierNormalized, modifierTokens, s.NormalizedLabel) })
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Sample.RecencyRank)
                .Select(x => x.Sample)
                .FirstOrDefault();
        }

        if (baseline is null)
        {
            return null;
        }

        var macro = new MealMacroEstimate(baseline.Calories, baseline.ProteinG, baseline.CarbsG, baseline.FatsG);
        var assumptions = new List<string>
        {
            $"delta clone from {targetDate:yyyy-MM-dd}: {baseline.Label}",
        };
        ApplyDeltaModifier(ref macro, delta.Modifier, assumptions);

        return new MealEstimateComputation
        {
            Calories = Math.Round(macro.Calories),
            ProteinG = Math.Round(macro.ProteinG),
            CarbsG = Math.Round(macro.CarbsG),
            FatsG = Math.Round(macro.FatsG),
            Confidence = "high",
            Assumptions = assumptions.ToArray(),
            Tuning = tuning,
            TopMatches = new[]
            {
                new MealEstimateDebugMatch
                {
                    Label = baseline.Label,
                    Score = 1,
                    Weight = 1,
                    Date = baseline.Date.ToString("yyyy-MM-dd"),
                    Calories = Math.Round(baseline.Calories),
                    ProteinG = Math.Round(baseline.ProteinG),
                    CarbsG = Math.Round(baseline.CarbsG),
                    FatsG = Math.Round(baseline.FatsG),
                }
            },
            UsedDeltaClone = true,
            DeltaBaseLabel = baseline.Label,
        };
    }

    private static void ApplyDeltaModifier(ref MealMacroEstimate macro, string modifier, List<string> assumptions)
    {
        if (string.IsNullOrWhiteSpace(modifier)) return;

        var normalized = modifier
            .Replace("plus", "+", StringComparison.OrdinalIgnoreCase)
            .Replace("minus", "-", StringComparison.OrdinalIgnoreCase)
            .Replace("add", "+", StringComparison.OrdinalIgnoreCase)
            .Replace("remove", "-", StringComparison.OrdinalIgnoreCase)
            .Replace("more", "+", StringComparison.OrdinalIgnoreCase)
            .Replace("less", "-", StringComparison.OrdinalIgnoreCase)
            .Replace("no ", "-1 ", StringComparison.OrdinalIgnoreCase);

        // Handle words like "half bowl", "double rice", "extra gravy".
        normalized = Regex.Replace(normalized, @"\bhalf\s+(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry|oil|ghee)\b", "0.5 $1", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\bquarter\s+(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry|oil|ghee)\b", "0.25 $1", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\bdouble\s+(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry)\b", "2 $1", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\btriple\s+(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry)\b", "3 $1", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\bextra\s+(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry|oil|ghee)\b", "+1 $1", RegexOptions.IgnoreCase);

        var regex = new Regex("([+-]?\\s*\\d+(?:\\.\\d+)?)\\s*(roti|rotis|chapati|chapatis|rice|cup|cups|bowl|bowls|egg|eggs|piece|pieces|gravy|curry|oil|ghee)", RegexOptions.IgnoreCase);
        var matches = regex.Matches(normalized);
        if (matches.Count == 0)
        {
            assumptions.Add($"delta modifier not mapped: {modifier}");
            return;
        }

        foreach (Match match in matches)
        {
            if (!double.TryParse(match.Groups[1].Value.Replace(" ", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var qty))
            {
                continue;
            }

            var unit = match.Groups[2].Value.ToLowerInvariant();
            var per = unit switch
            {
                "roti" or "rotis" or "chapati" or "chapatis" => new MealMacroEstimate(120, 3, 20, 2),
                "rice" or "cup" or "cups" => new MealMacroEstimate(210, 4, 45, 1),
                "bowl" or "bowls" => new MealMacroEstimate(180, 8, 16, 9),
                "egg" or "eggs" => new MealMacroEstimate(72, 6, 0.4, 5),
                "gravy" or "curry" => new MealMacroEstimate(90, 2, 6, 6),
                "oil" or "ghee" => new MealMacroEstimate(45, 0, 0, 5),
                _ => new MealMacroEstimate(90, 6, 8, 4),
            };

            macro = new MealMacroEstimate(
                macro.Calories + (per.Calories * qty),
                macro.ProteinG + (per.ProteinG * qty),
                macro.CarbsG + (per.CarbsG * qty),
                macro.FatsG + (per.FatsG * qty)
            );
            assumptions.Add($"delta applied: {qty:0.##} {unit}");
        }
    }
}

file sealed class MealMacroSample
{
    public string Label { get; set; } = string.Empty;
    public string NormalizedLabel { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int RecencyRank { get; set; }
    public double Calories { get; set; }
    public double ProteinG { get; set; }
    public double CarbsG { get; set; }
    public double FatsG { get; set; }
    public double SourceWeight { get; set; } = 1.0;
}

file sealed class MealEstimateComputation
{
    public double Calories { get; set; }
    public double ProteinG { get; set; }
    public double CarbsG { get; set; }
    public double FatsG { get; set; }
    public string Confidence { get; set; } = "low";
    public string[] Assumptions { get; set; } = Array.Empty<string>();
    public AdaptiveTuningConfig Tuning { get; set; } = new();
    public MealEstimateDebugMatch[] TopMatches { get; set; } = Array.Empty<MealEstimateDebugMatch>();
    public bool UsedDeltaClone { get; set; }
    public string? DeltaBaseLabel { get; set; }
}

file sealed class MealEstimateDebugMatch
{
    public string Label { get; set; } = string.Empty;
    public double Score { get; set; }
    public double Weight { get; set; }
    public string Date { get; set; } = string.Empty;
    public double Calories { get; set; }
    public double ProteinG { get; set; }
    public double CarbsG { get; set; }
    public double FatsG { get; set; }
}

file sealed class AdaptiveTuningConfig
{
    public bool MatureProfile { get; set; }
    public int SampleCount { get; set; }
    public int ActiveDays { get; set; }
    public double MinimumSimilarityCutoff { get; set; }
    public double MediumConfidenceCutoff { get; set; }
    public double HighConfidenceCutoff { get; set; }
    public double BlendDivisor { get; set; }
    public double BlendMin { get; set; }
    public double BlendMax { get; set; }
}

file sealed class DeltaCommand
{
    public int DaysBack { get; set; }
    public string Modifier { get; set; } = string.Empty;
    public string Raw { get; set; } = string.Empty;
}

file readonly record struct MealMacroEstimate(double Calories, double ProteinG, double CarbsG, double FatsG);

file static class QuickLogPayloadHelpers
{
    public static Dictionary<string, object> ToDictionary(JsonDocument doc)
    {
        try
        {
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(doc.RootElement.GetRawText());
            return result ?? new Dictionary<string, object>();
        }
        catch
        {
            return new Dictionary<string, object>();
        }
    }

    public static string NormalizeMealLabel(string label)
        => string.Join(' ', (label ?? string.Empty)
            .ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) || char.IsWhiteSpace(ch) ? ch : ' ')
            .ToArray())
            .Trim();

    public static string InferMealLabel(Dictionary<string, object> payload)
    {
        var captureText = GetString(payload, "captureText");
        if (!string.IsNullOrWhiteSpace(captureText)) return captureText;
        var mealName = GetString(payload, "mealName");
        if (!string.IsNullOrWhiteSpace(mealName)) return mealName;
        return GetString(payload, "description") ?? "Meal";
    }

    public static string? GetString(Dictionary<string, object> payload, string key)
    {
        if (!payload.TryGetValue(key, out var value) || value is null) return null;
        if (value is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.String) return el.GetString();
            if (el.ValueKind == JsonValueKind.Number) return el.GetRawText();
            if (el.ValueKind == JsonValueKind.True) return "true";
            if (el.ValueKind == JsonValueKind.False) return "false";
            return el.ToString();
        }
        return value.ToString();
    }

    public static bool GetBool(Dictionary<string, object> payload, string key)
    {
        if (!payload.TryGetValue(key, out var value) || value is null) return false;
        if (value is bool b) return b;
        if (value is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.True) return true;
            if (el.ValueKind == JsonValueKind.False) return false;
            if (el.ValueKind == JsonValueKind.String && bool.TryParse(el.GetString(), out var parsed)) return parsed;
            return false;
        }
        return bool.TryParse(value.ToString(), out var result) && result;
    }

    public static int? GetInt(Dictionary<string, object> payload, string key)
    {
        if (!payload.TryGetValue(key, out var value) || value is null) return null;
        if (value is int i) return i;
        if (value is long l && l <= int.MaxValue && l >= int.MinValue) return (int)l;
        if (value is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n)) return n;
            if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var parsed)) return parsed;
            return null;
        }
        return int.TryParse(value.ToString(), out var result) ? result : null;
    }

    public static IEnumerable<int> GetIntArray(Dictionary<string, object> payload, string key)
    {
        if (!payload.TryGetValue(key, out var value) || value is null) return Enumerable.Empty<int>();

        if (value is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Array)
            {
                return el.EnumerateArray()
                    .Select(item =>
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var n)) return n;
                        if (item.ValueKind == JsonValueKind.String && int.TryParse(item.GetString(), out var parsed)) return parsed;
                        return 0;
                    })
                    .Where(n => n > 0)
                    .ToArray();
            }
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var single))
            {
                return new[] { single };
            }
        }

        if (value is IEnumerable<object> list)
        {
            return list
                .Select(item => int.TryParse(item?.ToString(), out var n) ? n : 0)
                .Where(n => n > 0)
                .ToArray();
        }

        if (int.TryParse(value.ToString(), out var fallback))
        {
            return new[] { fallback };
        }

        return Enumerable.Empty<int>();
    }

    public static bool TryGetMacros(Dictionary<string, object> payload, out MealMacroEstimate macros)
    {
        macros = new MealMacroEstimate(0, 0, 0, 0);

        var calories = GetDouble(payload, "calories");
        var protein = GetDouble(payload, "proteinG");
        var carbs = GetDouble(payload, "carbsG");
        var fats = GetDouble(payload, "fatsG");

        var hasAny = calories > 0 || protein > 0 || carbs > 0 || fats > 0;
        if (!hasAny) return false;

        macros = new MealMacroEstimate(calories, protein, carbs, fats);
        return true;
    }

    public static double GetDouble(Dictionary<string, object> payload, string key)
    {
        if (!payload.TryGetValue(key, out var value) || value is null) return 0;
        if (value is double d) return d;
        if (value is float f) return f;
        if (value is decimal dc) return (double)dc;
        if (value is int i) return i;
        if (value is long l) return l;
        if (value is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Number)
            {
                return el.TryGetDouble(out var num) ? num : 0;
            }
            if (el.ValueKind == JsonValueKind.String)
            {
                return double.TryParse(el.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0;
            }
            return 0;
        }
        return double.TryParse(value.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var result) ? result : 0;
    }
}

// ─── Extension Methods ────────────────────────────────────────────────────

public static class DateTimeExtensions
{
    public static string ToIso8601String(this DateTime dt)
        => dt.Kind == DateTimeKind.Utc || dt.Kind == DateTimeKind.Unspecified
            ? dt.ToString("O")
            : dt.ToUniversalTime().ToString("O");
}
