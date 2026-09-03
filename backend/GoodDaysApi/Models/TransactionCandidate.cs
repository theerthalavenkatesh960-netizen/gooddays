using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("transaction_candidates")]
public class TransactionCandidate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("source_message_id")]
    [MaxLength(200)]
    public string SourceMessageId { get; set; } = string.Empty;

    [Column("source_thread_id")]
    [MaxLength(200)]
    public string? SourceThreadId { get; set; }

    [Required]
    [Column("status")]
    [MaxLength(30)]
    public string Status { get; set; } = "NEEDS_REVIEW";

    [Column("evidence_json", TypeName = "jsonb")]
    public string EvidenceJson { get; set; } = "{}";

    [Column("error")]
    public string? Error { get; set; }

    [Column("extraction_version")]
    public string ExtractionVersion { get; set; } = "v2.0";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}