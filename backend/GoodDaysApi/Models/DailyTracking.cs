using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_tracking")]
public class DailyTracking
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required]
    [Column("date")]
    public DateTime Date { get; set; }

    [Column("sleep_hours")]
    public decimal SleepHours { get; set; } = 0;

    [Column("workout_minutes")]
    public int WorkoutMinutes { get; set; } = 0;

    [Column("phone_minutes")]
    public int PhoneMinutes { get; set; } = 0;

    [Column("sunlight")]
    public bool Sunlight { get; set; } = false;

    [Column("mood")]
    public int Mood { get; set; } = 3;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
