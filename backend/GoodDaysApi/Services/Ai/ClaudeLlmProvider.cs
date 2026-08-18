using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Ai;

public class ClaudeLlmProvider : ILlmProvider
{
    private readonly string _apiKey;
    private readonly string _modelId;
    private readonly HttpClient _httpClient;

    public ClaudeLlmProvider(string apiKey, string modelId)
    {
        _apiKey = apiKey;
        _modelId = modelId;
        _httpClient = new HttpClient();
    }

    public async Task<LlmResponse> CallAsync(string userMessage, List<AiMessage> history, List<Tool> availableTools)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", _apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var messages = history
                .Select(m => new Dictionary<string, object>
                {
                    ["role"] = m.Role == "assistant" ? "assistant" : "user",
                    ["content"] = m.Content
                })
                .ToList();

            messages.Add(new Dictionary<string, object>
            {
                ["role"] = "user",
                ["content"] = userMessage
            });

            var payload = new Dictionary<string, object>
            {
                ["model"] = _modelId,
                ["max_tokens"] = 2048,
                ["system"] = GetSystemPrompt(),
                ["messages"] = messages
            };

            request.Content = JsonContent.Create(payload);
            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var aiText = "";
            if (root.TryGetProperty("content", out var contentArray) && contentArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in contentArray.EnumerateArray())
                {
                    if (item.TryGetProperty("type", out var type) && type.GetString() == "text" &&
                        item.TryGetProperty("text", out var text))
                    {
                        aiText += text.GetString();
                    }
                }
            }

            int? tokensUsed = null;
            if (root.TryGetProperty("usage", out var usage))
            {
                var inTokens = usage.TryGetProperty("input_tokens", out var i) ? i.GetInt32() : 0;
                var outTokens = usage.TryGetProperty("output_tokens", out var o) ? o.GetInt32() : 0;
                tokensUsed = inTokens + outTokens;
            }

            return new LlmResponse
            {
                Content = string.IsNullOrWhiteSpace(aiText) ? "I couldn't process that request." : aiText,
                TokensUsed = tokensUsed
            };
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Claude API call failed: {ex.Message}", ex);
        }
    }

    public async Task<LlmResponse> ContinueAsync(string toolResult, List<Tool> availableTools)
    {
        // This would be used for tool result continuation
        // For now, return a simple response
        return new LlmResponse { Content = toolResult };
    }

    private string GetSystemPrompt()
    {
        return @"You are an AI assistant integrated into a personal life tracking application. Your role is to help users manage their goals, health, workouts, meals, finances, and daily activities.

When users describe something they want to accomplish or log, understand their intent and help them by calling the appropriate tools. Think step-by-step about what data to capture.

For example:
- 'I worked out today' might mean logging a workout
- 'I spent $50 on groceries' means logging an expense
- 'Read 100 pages this week' means creating a recurring goal

Always be helpful, proactive, and ask clarifying questions if needed. Format responses naturally and let the user know what actions were taken.";
    }
}
