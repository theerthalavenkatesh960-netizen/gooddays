namespace GoodDaysApi.Services.Gmail.Models;

public class GmailConnectionStatus
{
    public bool Connected { get; set; }
    public string? Email { get; set; }
    public DateTime? LastSyncedUtc { get; set; }
    public string Provider { get; set; } = "gmail";
}
