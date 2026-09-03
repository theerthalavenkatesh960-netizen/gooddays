using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

/// Per-sender accuracy record used to auto-trust formats the user keeps confirming.
[Table("gmail_sender_stats")]
public class GmailSenderStat
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("sender_key")]
    [MaxLength(200)]
    public string SenderKey { get; set; } = string.Empty;

    [Column("confirmed_count")]
    public int ConfirmedCount { get; set; }

    [Column("rejected_count")]
    public int RejectedCount { get; set; }

    [Column("last_seen_utc")]
    public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
}
