using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services;

public class AiService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public record HealthRecommendationResult(
        int RecommendedDailyCalories,
        string RecommendedActivityLevel,
        string Rationale,
        bool? Feasible,
        string? GoalType,
        JsonElement Analysis);

    public AiService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Main method to invoke AI provider (Claude or Local Llama)
    /// </summary>
    public async Task<string> InvokeProvider(UserAiSetting? settings, string prompt, string purpose)
    {
        var provider = (settings?.Provider ?? "local-llama").Trim().ToLowerInvariant();
        if (provider == "claude") return await InvokeClaude(settings, prompt, purpose);
        return await InvokeLocalLlama(settings, prompt, purpose);
    }

    /// <summary>
    /// Invoke Local Llama (Ollama)
    /// </summary>
    private async Task<string> InvokeLocalLlama(UserAiSetting? settings, string prompt, string purpose)
    {
        var endpoint = string.IsNullOrWhiteSpace(settings?.LocalEndpoint) ? "http://localhost:11434" : settings!.LocalEndpoint.Trim();
        var url = endpoint.TrimEnd('/') + "/api/generate";

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        var payload = new
        {
            model = string.IsNullOrWhiteSpace(settings?.LocalModel) ? "llama3.1:8b" : settings!.LocalModel.Trim(),
            prompt,
            stream = false,
            format = "json",
        };

        var response = await client.PostAsync(url, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Local Llama request failed ({(int)response.StatusCode}) for {purpose}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("response", out var responseNode))
        {
            throw new InvalidOperationException($"Local Llama returned no 'response' field for {purpose}.");
        }

        return responseNode.GetString() ?? "{}";
    }

    /// <summary>
    /// Invoke Claude (Anthropic)
    /// </summary>
    private async Task<string> InvokeClaude(UserAiSetting? settings, string prompt, string purpose)
    {
        var apiKey = settings?.ClaudeApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Claude is selected but API key is empty in AI Planner settings.");
        }

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        req.Headers.Add("x-api-key", apiKey.Trim());
        req.Headers.Add("anthropic-version", "2023-06-01");
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = string.IsNullOrWhiteSpace(settings?.ClaudeModel) ? "claude-3-5-sonnet-latest" : settings!.ClaudeModel.Trim(),
            max_tokens = 1800,
            temperature = 0.2,
            messages = new[] { new { role = "user", content = prompt } },
        }), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(req);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Claude request failed ({(int)response.StatusCode}) for {purpose}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("content", out var contentNode) || contentNode.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException($"Claude returned invalid content payload for {purpose}.");
        }

        var sb = new StringBuilder();
        foreach (var item in contentNode.EnumerateArray())
        {
            if (item.TryGetProperty("type", out var typeNode)
                && string.Equals(typeNode.GetString(), "text", StringComparison.OrdinalIgnoreCase)
                && item.TryGetProperty("text", out var textNode))
            {
                sb.AppendLine(textNode.GetString());
            }
        }
        return sb.ToString();
    }

    /// <summary>
    /// Generate health recommendations based on current and target weight
    /// </summary>
    public async Task<HealthRecommendationResult> GetHealthRecommendations(
        UserAiSetting? settings,
        int? heightCm,
        decimal currentWeightKg,
        decimal targetWeightKg,
        DateTime targetDate,
        int? age,
        string? gender,
        string? selfReportedActivityLevel,
        IReadOnlyList<MedicalCondition>? medicalConditions,
        string? dietPreference)
    {
        var prompt = BuildHealthRecommendationPrompt(heightCm, currentWeightKg, targetWeightKg, targetDate, age, gender, selfReportedActivityLevel, medicalConditions, dietPreference);
        var rawText = await InvokeProvider(settings, prompt, "health-recommendation");
        var json = ParseJsonObject(rawText);

        var calories = 2000;
        var activity = "Moderate";
        string? goalType = null;
        bool? feasible = null;
        var rationale = "Generated by AI based on current/target weight and target timeline.";

        if (json.TryGetProperty("feasible", out var feasibleNode) && feasibleNode.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            feasible = feasibleNode.GetBoolean();
        }

        if (json.TryGetProperty("goal_type", out var goalTypeNode) && goalTypeNode.ValueKind == JsonValueKind.String)
        {
            var rawGoalType = goalTypeNode.GetString();
            if (!string.IsNullOrWhiteSpace(rawGoalType)) goalType = rawGoalType.Trim().ToLowerInvariant();
        }

        if (json.TryGetProperty("recommendation", out var recommendationNode) && recommendationNode.ValueKind == JsonValueKind.Object)
        {
            if (recommendationNode.TryGetProperty("daily_calories", out var dailyCaloriesNode) && dailyCaloriesNode.TryGetInt32(out var recCalories))
            {
                calories = recCalories;
            }

            if (recommendationNode.TryGetProperty("activity_level", out var activityLevelNode) && activityLevelNode.ValueKind == JsonValueKind.String)
            {
                var parsedActivity = activityLevelNode.GetString();
                if (!string.IsNullOrWhiteSpace(parsedActivity))
                {
                    activity = NormalizeActivityLevelForUi(parsedActivity);
                }
            }

            if (recommendationNode.TryGetProperty("warnings", out var warningsNode) && warningsNode.ValueKind == JsonValueKind.Array)
            {
                foreach (var warning in warningsNode.EnumerateArray())
                {
                    if (warning.ValueKind == JsonValueKind.String)
                    {
                        var message = warning.GetString();
                        if (!string.IsNullOrWhiteSpace(message))
                        {
                            rationale = message.Trim();
                            break;
                        }
                    }
                }
            }
        }

        if (json.TryGetProperty("recommendedDailyCalories", out var calNode) && calNode.TryGetInt32(out var cal))
        {
            calories = cal;
        }

        if (json.TryGetProperty("recommendedActivityLevel", out var actNode) && actNode.ValueKind == JsonValueKind.String)
        {
            var act = actNode.GetString();
            if (!string.IsNullOrWhiteSpace(act))
            {
                activity = NormalizeActivityLevelForUi(act);
            }
        }

        if (json.TryGetProperty("feasibility_check", out var feasibilityNode)
            && feasibilityNode.ValueKind == JsonValueKind.Object
            && feasibilityNode.TryGetProperty("reason", out var reasonNode)
            && reasonNode.ValueKind == JsonValueKind.String)
        {
            var reason = reasonNode.GetString();
            if (!string.IsNullOrWhiteSpace(reason)) rationale = reason.Trim();
        }

        if (json.TryGetProperty("alternative_plan", out var altPlanNode)
            && altPlanNode.ValueKind == JsonValueKind.Object
            && altPlanNode.TryGetProperty("interim_focus", out var interimNode)
            && interimNode.ValueKind == JsonValueKind.String)
        {
            var interim = interimNode.GetString();
            if (!string.IsNullOrWhiteSpace(interim)) rationale = interim.Trim();
        }

        return new HealthRecommendationResult(calories, activity, rationale, feasible, goalType, json);
    }

    private static string BuildHealthRecommendationPrompt(
        int? heightCm,
        decimal currentWeightKg,
        decimal targetWeightKg,
        DateTime targetDate,
        int? age,
        string? gender,
        string? selfReportedActivityLevel,
        IReadOnlyList<MedicalCondition>? medicalConditions,
        string? dietPreference)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an expert fitness and nutrition advisor with deep knowledge of sports science, exercise physiology, and clinical nutrition.");
        sb.AppendLine();
        sb.AppendLine($"Today's date: {DateTime.UtcNow:yyyy-MM-dd}");
        sb.AppendLine();
        sb.AppendLine("USER PROFILE");
        sb.AppendLine($"- Age: {(age.HasValue ? age.Value : 30)}");
        sb.AppendLine($"- Gender: {(string.IsNullOrWhiteSpace(gender) ? "male" : gender.Trim())}");
        sb.AppendLine($"- Height: {(heightCm.HasValue ? $"{heightCm} cm" : "unknown")}");
        sb.AppendLine($"- Current Weight: {currentWeightKg} kg");
        sb.AppendLine($"- Target Weight: {targetWeightKg} kg");
        sb.AppendLine($"- Target Date: {targetDate:yyyy-MM-dd}");
        sb.AppendLine($"- Diet Preference: {(string.IsNullOrWhiteSpace(dietPreference) ? "Mixed" : dietPreference)}");
        sb.AppendLine($"- Activity Level (self-reported): {(string.IsNullOrWhiteSpace(selfReportedActivityLevel) ? "moderate" : selfReportedActivityLevel.Trim())}");
        if (medicalConditions == null || medicalConditions.Count == 0)
        {
            sb.AppendLine("- Medical Conditions (if any): none");
        }
        else
        {
            sb.AppendLine("- Medical Conditions:");
            foreach (var c in medicalConditions)
            {
                var dietR = c.DietRestrictions.Count > 0 ? $", diet restrictions: {string.Join(", ", c.DietRestrictions)}" : "";
                var exLim = c.ExerciseLimits.Count > 0 ? $", exercise limits: {string.Join(", ", c.ExerciseLimits)}" : "";
                var meds = c.MedicationsAffectingPlan.Count > 0 ? $", medications: {string.Join(", ", c.MedicationsAffectingPlan)}" : "";
                var notes = string.IsNullOrWhiteSpace(c.Notes) ? "" : $", notes: {c.Notes.Trim()}";
                sb.AppendLine($"  * {c.ConditionName} ({c.Status}, {c.Severity}){dietR}{exLim}{meds}{notes}");
            }
        }
        sb.AppendLine();
        sb.AppendLine("STEP 1 — DERIVED CALCULATIONS (do these internally)");
        sb.AppendLine("Compute the following before generating output:");
        sb.AppendLine("1. days_remaining = TARGET_DATE - TODAY_DATE (in days)");
        sb.AppendLine("2. weight_delta_kg = TARGET_WEIGHT_KG - CURRENT_WEIGHT_KG (positive = bulk, negative = cut)");
        sb.AppendLine("3. weekly_change_needed = (weight_delta_kg / days_remaining) * 7");
        sb.AppendLine("4. BMI = CURRENT_WEIGHT_KG / (HEIGHT_CM / 100)^2");
        sb.AppendLine("5. BMR using Mifflin-St Jeor");
        sb.AppendLine("6. TDEE = BMR * activity_multiplier (sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very-active=1.9)");
        sb.AppendLine("7. daily_calorie_adjustment = (weight_delta_kg * 7700) / days_remaining");
        sb.AppendLine("8. recommended_daily_calories = TDEE + daily_calorie_adjustment");
        sb.AppendLine();
        sb.AppendLine("STEP 2 — FEASIBILITY CHECKS");
        sb.AppendLine("Apply all checks strictly: date check, rate check, calorie floor check, BMI conflict check, and same-weight maintenance check.");
        sb.AppendLine();
        sb.AppendLine("STEP 3 — IF FEASIBLE, GENERATE RECOMMENDATIONS");
        sb.AppendLine("- Pick nearest daily_calories from [1500, 1800, 2000, 2400, 2700, 3000, 3500]");
        sb.AppendLine("- Provide macros (protein/carbs/fat)");
        sb.AppendLine("- Recommend activity_level");
        sb.AppendLine("- Add warnings for aggressive timelines");
        sb.AppendLine("- Generate 4 milestone checkpoints");
        sb.AppendLine();
        sb.AppendLine("STEP 4 — ALTERNATIVE PLAN (if infeasible)");
        sb.AppendLine("If infeasible, include safe_target_date, safe_weekly_rate_kg, interim_focus.");
        sb.AppendLine();
        sb.AppendLine("OUTPUT FORMAT — STRICT JSON ONLY. No markdown, no explanation outside JSON.");
        sb.AppendLine("{");
        sb.AppendLine("  \"feasible\": true,");
        sb.AppendLine("  \"goal_type\": \"cut\",");
        sb.AppendLine("  \"bmi\": 22.1,");
        sb.AppendLine("  \"bmr\": 1700,");
        sb.AppendLine("  \"tdee\": 2635,");
        sb.AppendLine("  \"days_remaining\": 90,");
        sb.AppendLine("  \"weekly_change_needed_kg\": -0.5,");
        sb.AppendLine("  \"feasibility_check\": { \"passed\": true, \"failed_rule\": null, \"reason\": null },");
        sb.AppendLine("  \"recommendation\": {");
        sb.AppendLine("    \"daily_calories\": 2000,");
        sb.AppendLine("    \"activity_level\": \"active\",");
        sb.AppendLine("    \"macros\": { \"protein_g\": 160, \"carbs_g\": 210, \"fat_g\": 65 },");
        sb.AppendLine("    \"warnings\": [],");
        sb.AppendLine("    \"milestones\": [");
        sb.AppendLine("      { \"date\": \"2026-07-01\", \"expected_weight_kg\": 70.5 },");
        sb.AppendLine("      { \"date\": \"2026-08-01\", \"expected_weight_kg\": 69.0 },");
        sb.AppendLine("      { \"date\": \"2026-09-01\", \"expected_weight_kg\": 67.5 },");
        sb.AppendLine("      { \"date\": \"2026-10-01\", \"expected_weight_kg\": 66.0 }");
        sb.AppendLine("    ]");
        sb.AppendLine("  },");
        sb.AppendLine("  \"alternative_plan\": null");
        sb.AppendLine("}");
        return sb.ToString();
    }

    private static string NormalizeActivityLevelForUi(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Replace("_", "-").Replace(" ", "-");
        return normalized switch
        {
            "sedentary" => "Sedentary",
            "light" => "Light",
            "moderate" => "Moderate",
            "active" => "Active",
            "very-active" => "Very Active",
            _ => "Moderate",
        };
    }

    private static JsonElement ParseJsonObject(string text)
    {
        var trimmed = (text ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) throw new InvalidOperationException("AI returned empty response.");

        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstBrace = trimmed.IndexOf('{');
            var lastBrace = trimmed.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) trimmed = trimmed.Substring(firstBrace, lastBrace - firstBrace + 1);
        }

        var start = trimmed.IndexOf('{');
        var end = trimmed.LastIndexOf('}');
        if (start >= 0 && end > start) trimmed = trimmed.Substring(start, end - start + 1);

        using var doc = JsonDocument.Parse(trimmed);
        return doc.RootElement.Clone();
    }
}
