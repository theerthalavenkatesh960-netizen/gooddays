using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("user_profiles")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    [Required]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("google_id")]
    public string? GoogleId { get; set; }

    [Column("level")]
    public int Level { get; set; } = 1;

    [Column("points")]
    public int Points { get; set; } = 0;

    [Column("theme")]
    public string Theme { get; set; } = "light";

    [Column("calorie_goal")]
    public int CalorieGoal { get; set; } = 2400;

    [Column("tracking_options_json")]
    public string TrackingOptionsJson { get; set; } = "[\"sleep_hours\",\"workout_minutes\",\"phone_minutes\"]";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
