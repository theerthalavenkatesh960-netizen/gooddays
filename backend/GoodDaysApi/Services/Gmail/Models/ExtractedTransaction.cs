namespace GoodDaysApi.Services.Gmail.Models;

public class ExtractedTransaction
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string? Merchant { get; set; }
    public string TransactionType { get; set; } = "OTHER";
    public string Direction { get; set; } = "DEBIT";
    public string InstrumentType { get; set; } = "UNKNOWN";
    public string TransactionStatus { get; set; } = "UNKNOWN";
    public DateTime? TransactionDateUtc { get; set; }
    public string? ProviderOrBank { get; set; }
    public string? InstrumentLast4 { get; set; }
    public string? ReferenceNumber { get; set; }
    public string SuggestedCategory { get; set; } = "Other";
    public decimal ConfidenceScore { get; set; }
    public string EvidenceJson { get; set; } = "{}";
}
