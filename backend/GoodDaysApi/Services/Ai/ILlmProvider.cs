using System.Text.Json.Serialization;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Ai;

public class ToolCall
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("parameters")]
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public class LlmResponse
{
    public string Content { get; set; } = "";
    
    public ToolCall? ToolCall { get; set; }
    
    public int? TokensUsed { get; set; }
    
    public System.Text.Json.JsonDocument? ActionTaken { get; set; }
}

public class Tool
{
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public InputSchema InputSchema { get; set; } = new();
}

public class InputSchema
{
    public string Type { get; set; } = "object";
    
    public Dictionary<string, PropertyDef> Properties { get; set; } = new();
    
    public List<string>? Required { get; set; }
}

public class PropertyDef
{
    public string Type { get; set; } = "string";
    
    public string? Description { get; set; }
}

public interface ILlmProvider
{
    Task<LlmResponse> CallAsync(string userMessage, List<AiMessage> history, List<Tool> availableTools);
    
    Task<LlmResponse> ContinueAsync(string toolResult, List<Tool> availableTools);
}
