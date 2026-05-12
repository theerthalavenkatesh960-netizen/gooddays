using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("weekly_routine_schedule")]
public class WeeklyRoutineSchedule
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>0 = Sunday, 1 = Monday, … 6 = Saturday</summary>
    [Column("day_of_week")]
    public int DayOfWeek { get; set; }

    /// <summary>Null means "rest day" — no routine assigned.</summary>
    [Column("routine_id")]
    public int? RoutineId { get; set; }
    public DailyRoutine? Routine { get; set; }
}
