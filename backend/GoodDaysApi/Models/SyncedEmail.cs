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

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
