using System.Net.Http.Json;
using System.Text.Json;
using Anthropic;

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
            var client = new Anthropic.Anthropic(_apiKey);
            
            // Build message history
            var messages = history.Select(m => new Anthropic.Message.MessageParam
            {
                Role = m.Role == "user" ? "user" : "assistant",
                Content = m.Content
            }).ToList();
            
            // Add current user message
            messages.Add(new Anthropic.Message.MessageParam
            {
                Role = "user",
                Content = userMessage
            });

            // Convert tools to Claude format
            var claudeTools = availableTools.Select(t => new Anthropic.Tool
            {
                Name = t.Name,
                Description = t.Description,
                InputSchema = new Anthropic.ToolInputSchema
                {
                    Type = "object",
                    Properties = t.InputSchema.Properties.ToDictionary(
                        p => p.Key,
                        p => new Anthropic.ToolInputSchema.Property
                        {
                            Type = p.Value.Type,
                            Description = p.Value.Description
                        }
                    ),
                    Required = t.InputSchema.Required
                }
            }).ToList();

            // Call Claude API
            var response = await client.Messages.CreateAsync(new Anthropic.MessageCreateParams
            {
                Model = _modelId,
                MaxTokens = 2048,
                Messages = messages,
                Tools = claudeTools.Count > 0 ? claudeTools : null,
                SystemPrompt = GetSystemPrompt()
            });

            var textContent = response.Content.FirstOrDefault(c => c.Type == "text");
            var toolUseContent = response.Content.FirstOrDefault(c => c.Type == "tool_use");

            var result = new LlmResponse
            {
                Content = textContent?.GetType().GetProperty("Text")?.GetValue(textContent)?.ToString() ?? "",
                TokensUsed = response.Usage.OutputTokens + response.Usage.InputTokens
            };

            if (toolUseContent != null)
            {
                var toolName = (string)toolUseContent.GetType().GetProperty("Name").GetValue(toolUseContent);
                var toolInput = (Dictionary<string, object>)toolUseContent.GetType().GetProperty("Input").GetValue(toolUseContent);
                
                result.ToolCall = new ToolCall
                {
                    Name = toolName,
                    Parameters = toolInput
                };
            }

            return result;
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
