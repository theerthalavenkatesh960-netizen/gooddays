using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("weekly_recommendation_snapshots")]
public class WeeklyRecommendationSnapshot
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("week_start")]
    public DateTime WeekStart { get; set; }

    [Column("target_week_start")]
    public DateTime TargetWeekStart { get; set; }

    /// <summary>pending | approved | dismissed | partial</summary>
    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("snapshot_json", TypeName = "jsonb")]
    public string SnapshotJson { get; set; } = "{}";

    [Column("generated_at")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [Column("decided_at")]
    public DateTime? DecidedAt { get; set; }

    public User? User { get; set; }
}
