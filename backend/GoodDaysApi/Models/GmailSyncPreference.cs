using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("gmail_sync_preferences")]
public class GmailSyncPreference
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("finance_sender_allowlist")]
    public string FinanceSenderAllowlist { get; set; } = string.Empty;

    [Column("blocked_sender_patterns")]
    public string BlockedSenderPatterns { get; set; } = string.Empty;

    [Column("trusted_order_domains")]
    public string TrustedOrderDomains { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
