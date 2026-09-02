using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("expenses")]
public class Expense
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Column("amount")]
    public decimal Amount { get; set; }
    [Column("category")]
    public string? Category { get; set; }

    [Column("gmail_message_id")]
    public string? GmailMessageId { get; set; }

    [Column("external_reference")]
    public string? ExternalReference { get; set; }

    [Column("source_type")]
    public string? SourceType { get; set; }

    [Column("direction")]
    public string Direction { get; set; } = "DEBIT";

    [Column("transaction_type")]
    public string TransactionType { get; set; } = "OTHER";

    [Column("transaction_status")]
    public string TransactionStatus { get; set; } = "UNKNOWN";

    [Column("payment_instrument_type")]
    public string PaymentInstrumentType { get; set; } = "UNKNOWN";

    [Column("institution_name")]
    public string? InstitutionName { get; set; }

    [Column("instrument_last4")]
    public string? InstrumentLast4 { get; set; }

    [Column("extraction_version")]
    public string ExtractionVersion { get; set; } = "v2.0";

    [Column("evidence_json")]
    public string EvidenceJson { get; set; } = "{}";

    // originally detected merchant text, kept even after a manual correction, used as the alias lookup key
    [Column("raw_merchant")]
    public string? RawMerchant { get; set; }

    [Column("is_reviewed")]
    public bool IsReviewed { get; set; } = true;

    [Column("reviewed_at")]
    public DateTime? ReviewedAt { get; set; }

    // optional date for the expense; falls back to CreatedAt when not set
    [Column("date")]
    public DateTime? Date { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
