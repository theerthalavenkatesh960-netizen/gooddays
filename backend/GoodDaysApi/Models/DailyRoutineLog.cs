using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_routine_logs")]
public class DailyRoutineLog
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("routine_block_id")]
    public int RoutineBlockId { get; set; }
    public RoutineBlock RoutineBlock { get; set; } = null!;

    [Column("date")]
    public DateOnly Date { get; set; }

    /// <summary>"completed" | "skipped" | "missed"</summary>
    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("logged_at")]
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
}
