namespace GoodDaysApi.Models;

public class UserAiSetting
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string Provider { get; set; } = "local-llama";
    public string LocalEndpoint { get; set; } = "http://localhost:11434";
    public string LocalModel { get; set; } = "llama3.1:8b";
    public string? ClaudeApiKey { get; set; }
    public string ClaudeModel { get; set; } = "claude-3-5-sonnet-latest";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
