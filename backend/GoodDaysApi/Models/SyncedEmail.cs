using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("synced_emails")]
public class SyncedEmail
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("gmail_message_id")]
    [MaxLength(200)]
    public string GmailMessageId { get; set; } = string.Empty;

    [Column("thread_id")]
    [MaxLength(200)]
    public string? ThreadId { get; set; }

    [Column("internal_date")]
    public DateTime InternalDate { get; set; }

    [Column("processed_at")]
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    [Column("subject")]
    public string Subject { get; set; } = string.Empty;

    [Column("snippet")]
    public string Snippet { get; set; } = string.Empty;

    [Column("body_text")]
    public string BodyText { get; set; } = string.Empty;

    [Column("sender")]
    public string? Sender { get; set; }

    [Column("processing_status")]
    public string ProcessingStatus { get; set; } = "PROCESSED";

    [Column("parser_name")]
    public string ParserName { get; set; } = "GenericTransactionParser";

    [Column("extraction_version")]
    public string ExtractionVersion { get; set; } = "v2.0";

    [Column("processing_error")]
    public string? ProcessingError { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
