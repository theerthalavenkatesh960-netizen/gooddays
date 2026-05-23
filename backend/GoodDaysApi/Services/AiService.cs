using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services;

public class AiService
{
    private readonly IHttpClientFactory _httpClientFactory;

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
    public async Task<(int recommendedDailyCalories, string recommendedActivityLevel)> GetHealthRecommendations(
        UserAiSetting? settings,
        int? heightCm,
        decimal currentWeightKg,
        decimal targetWeightKg,
        DateTime targetDate,
        string? dietPreference)
    {
        var prompt = BuildHealthRecommendationPrompt(heightCm, currentWeightKg, targetWeightKg, targetDate, dietPreference);
        var rawText = await InvokeProvider(settings, prompt, "health-recommendation");
        var json = ParseJsonObject(rawText);

        var calories = 2000;
        var activity = "moderate";

        if (json.TryGetProperty("recommendedDailyCalories", out var calNode) && calNode.TryGetInt32(out var cal))
        {
            calories = cal;
        }

        if (json.TryGetProperty("recommendedActivityLevel", out var actNode) && actNode.ValueKind == JsonValueKind.String)
        {
            var act = actNode.GetString();
            if (!string.IsNullOrWhiteSpace(act))
            {
                activity = act.Trim().ToLowerInvariant();
            }
        }

        return (calories, activity);
    }

    private static string BuildHealthRecommendationPrompt(int? heightCm, decimal currentWeightKg, decimal targetWeightKg, DateTime targetDate, string? dietPreference)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a fitness/nutrition AI advisor. Based on the user's profile, recommend:");
        sb.AppendLine("1. Daily calorie target (choose one: 1500, 1800, 2000, 2400, 3000)");
        sb.AppendLine("2. Activity level (choose one: sedentary, light, moderate, active, very-active)");
        sb.AppendLine();
        sb.AppendLine($"User Profile:");
        sb.AppendLine($"- Height: {(heightCm.HasValue ? $"{heightCm} cm" : "unknown")}");
        sb.AppendLine($"- Current Weight: {currentWeightKg} kg");
        sb.AppendLine($"- Target Weight: {targetWeightKg} kg");
        sb.AppendLine($"- Target Date: {targetDate:yyyy-MM-dd}");
        sb.AppendLine($"- Diet Preference: {(string.IsNullOrWhiteSpace(dietPreference) ? "no preference" : dietPreference)}");
        sb.AppendLine();
        sb.AppendLine("Return STRICT JSON only with no markdown:");
        sb.AppendLine("{");
        sb.AppendLine("  \"recommendedDailyCalories\": 2000,");
        sb.AppendLine("  \"recommendedActivityLevel\": \"moderate\"");
        sb.AppendLine("}");
        return sb.ToString();
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
