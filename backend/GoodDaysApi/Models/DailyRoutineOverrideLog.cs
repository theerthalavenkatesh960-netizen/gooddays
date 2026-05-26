using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_routine_override_logs")]
public class DailyRoutineOverrideLog
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("override_id")]
    public int OverrideId { get; set; }
    public DailyRoutineBlockOverride Override { get; set; } = null!;

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("logged_at")]
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
}
