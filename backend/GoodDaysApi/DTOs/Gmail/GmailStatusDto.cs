namespace GoodDaysApi.DTOs.Gmail;

public class GmailStatusDto
{
    public bool Connected { get; set; }
    public string? Email { get; set; }
    public DateTime? LastSyncedUtc { get; set; }
    public string? Provider { get; set; }
}
