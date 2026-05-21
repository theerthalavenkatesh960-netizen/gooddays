namespace GoodDaysApi.Services.Gmail.Models;

public class ExtractedTransaction
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Merchant { get; set; } = "Transaction";
    public string TransactionType { get; set; } = "debit";
    public DateTime? TransactionDateUtc { get; set; }
    public string? ProviderOrBank { get; set; }
    public string? ReferenceNumber { get; set; }
    public string SuggestedCategory { get; set; } = "Other";
    public decimal ConfidenceScore { get; set; }
    public string RawSnippet { get; set; } = string.Empty;
}
