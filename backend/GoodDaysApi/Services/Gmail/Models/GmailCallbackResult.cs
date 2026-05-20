namespace GoodDaysApi.Services.Gmail.Models;

public class GmailCallbackResult
{
    public bool Success { get; set; }
    public string? Email { get; set; }
    public string Message { get; set; } = string.Empty;
}
