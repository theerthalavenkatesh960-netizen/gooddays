using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("connected_email_accounts")]
public class ConnectedEmailAccount
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Column("provider")]
    [MaxLength(50)]
    public string Provider { get; set; } = "gmail";

    [Required]
    [Column("access_token_encrypted")]
    public string AccessTokenEncrypted { get; set; } = string.Empty;

    [Required]
    [Column("refresh_token_encrypted")]
    public string RefreshTokenEncrypted { get; set; } = string.Empty;

    [Column("token_expiry_utc")]
    public DateTime TokenExpiryUtc { get; set; }

    [Column("last_synced_utc")]
    public DateTime? LastSyncedUtc { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
