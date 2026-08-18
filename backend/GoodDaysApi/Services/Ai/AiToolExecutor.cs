using System.Text.Json;

namespace GoodDaysApi.Services.Ai;

public interface IAiToolExecutor
{
    Task<string> ExecuteAsync(int userId, string toolName, Dictionary<string, JsonElement> parameters);
}

public class AiToolExecutor : IAiToolExecutor
{
    private readonly ILogger<AiToolExecutor> _logger;

    public AiToolExecutor(ILogger<AiToolExecutor> logger)
    {
        _logger = logger;
    }

    public Task<string> ExecuteAsync(int userId, string toolName, Dictionary<string, JsonElement> parameters)
    {
        _logger.LogInformation("AI tool execution requested. UserId={UserId}, Tool={ToolName}", userId, toolName);
        return Task.FromResult($"Tool '{toolName}' execution is not configured yet.");
    }
}
