using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("card_statements")]
public class CardStatement
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("card_id")]
    public Guid? CardId { get; set; }

    [Column("institution_name")]
    public string? InstitutionName { get; set; }

    [Column("card_last4")]
    [MaxLength(4)]
    public string? CardLast4 { get; set; }

    [Column("statement_date")]
    public DateTime? StatementDate { get; set; }

    [Column("due_date")]
    public DateTime? DueDate { get; set; }

    [Column("statement_balance")]
    public decimal? StatementBalance { get; set; }

    [Column("minimum_amount_due")]
    public decimal? MinimumAmountDue { get; set; }

    [Column("total_amount_due")]
    public decimal? TotalAmountDue { get; set; }

    [Column("available_credit_limit")]
    public decimal? AvailableCreditLimit { get; set; }

    [Column("credit_limit")]
    public decimal? CreditLimit { get; set; }

    [Column("currency")]
    public string Currency { get; set; } = "INR";

    [Column("source_message_id")]
    [MaxLength(200)]
    public string? SourceMessageId { get; set; }

    [Column("extraction_version")]
    public string ExtractionVersion { get; set; } = "v1.0";

    [Column("confidence_score")]
    public decimal ConfidenceScore { get; set; }

    [Column("evidence_json")]
    public string EvidenceJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CardId))]
    public CreditCard? Card { get; set; }
}
