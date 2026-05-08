using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_routine_skips")]
public class DailyRoutineSkip
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
