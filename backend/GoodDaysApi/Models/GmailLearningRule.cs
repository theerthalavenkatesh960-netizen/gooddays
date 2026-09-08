using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("gmail_learning_rules")]
public class GmailLearningRule
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("user_id")]
    public int UserId { get; set; }
    [Required, MaxLength(200)]
    [Column("sender_key")]
    public string SenderKey { get; set; } = string.Empty;
    [Required, MaxLength(60)]
    [Column("rule_type")]
    public string RuleType { get; set; } = string.Empty;
    [Required, MaxLength(200)]
    [Column("pattern_key")]
    public string PatternKey { get; set; } = string.Empty;
    [Required, MaxLength(120)]
    [Column("learned_value")]
    public string LearnedValue { get; set; } = string.Empty;
    [Column("confirmed_count")]
    public int ConfirmedCount { get; set; }
    [Column("rejected_count")]
    public int RejectedCount { get; set; }
    [Column("last_seen_utc")]
    public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
}
