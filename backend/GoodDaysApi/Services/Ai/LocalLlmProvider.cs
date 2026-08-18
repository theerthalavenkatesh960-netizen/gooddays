using System.Text.Json;
using System.Text.Json.Serialization;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Ai;

public class OllamaMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
    
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public class OllamaRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;
    
    [JsonPropertyName("messages")]
    public List<OllamaMessage> Messages { get; set; } = new();
    
    [JsonPropertyName("stream")]
    public bool Stream { get; set; } = false;
}

public class OllamaResponse
{
    [JsonPropertyName("message")]
    public OllamaMessage Message { get; set; } = new();
    
    [JsonPropertyName("done")]
    public bool Done { get; set; }
}

public class LocalLlmProvider : ILlmProvider
{
    private readonly string _baseUrl;
    private readonly string _model;
    private readonly HttpClient _httpClient;

    public LocalLlmProvider(string baseUrl, string model)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _model = model;
        _httpClient = new HttpClient();
    }

    public async Task<LlmResponse> CallAsync(string userMessage, List<AiMessage> history, List<Tool> availableTools)
    {
        try
        {
            // Build message history
            var messages = new List<OllamaMessage>();
            
            // Add system message
            messages.Add(new OllamaMessage
            {
                Role = "system",
                Content = GetSystemPrompt(availableTools)
            });
            
            // Add conversation history
            foreach (var msg in history)
            {
                messages.Add(new OllamaMessage
                {
                    Role = msg.Role,
                    Content = msg.Content
                });
            }
            
            // Add current message
            messages.Add(new OllamaMessage
            {
                Role = "user",
                Content = userMessage
            });

            var request = new OllamaRequest
            {
                Model = _model,
                Messages = messages,
                Stream = false
            };

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/chat", request);
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync();
            var ollamaResponse = JsonSerializer.Deserialize<OllamaResponse>(content);

            return new LlmResponse
            {
                Content = ollamaResponse?.Message?.Content ?? "I couldn't process that request.",
                TokensUsed = null // Ollama doesn't return token count in chat api
            };
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Local LLM call failed. Make sure Ollama is running on {_baseUrl}: {ex.Message}", ex);
        }
    }

    public async Task<LlmResponse> ContinueAsync(string toolResult, List<Tool> availableTools)
    {
        // For local models, continue with tool result
        return new LlmResponse { Content = toolResult };
    }

    private string GetSystemPrompt(List<Tool> availableTools)
    {
        var toolsList = string.Join("\n", availableTools.Select(t => $"- {t.Name}: {t.Description}"));
        
        return @$"You are an AI assistant integrated into a personal life tracking application. Your role is to help users manage their goals, health, workouts, meals, finances, and daily activities.

When users describe something they want to accomplish or log, understand their intent and naturally respond to help them.

Available actions you can suggest:
{toolsList}

For example:
- If user says 'I worked out today', suggest logging a workout
- If they say 'I spent $50 on groceries', suggest logging an expense  
- If they ask 'create a goal to read 100 pages per week', help them create that goal

Always be helpful, proactive, and ask clarifying questions if needed. Keep responses concise and natural.";
    }
}
