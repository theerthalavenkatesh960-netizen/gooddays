namespace GoodDaysApi.Services.Gmail.Models;

public class GmailMessageLite
{
    public string MessageId { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public DateTime InternalDateUtc { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string? From { get; set; }
}
