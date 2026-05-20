namespace GoodDaysApi.Services.Gmail.Models;

public class GmailSyncResult
{
    public int Scanned { get; set; }
    public int Parsed { get; set; }
    public int Created { get; set; }
    public int DuplicatesSkipped { get; set; }
    public int ParseFailed { get; set; }
    public int ApiErrors { get; set; }
}
