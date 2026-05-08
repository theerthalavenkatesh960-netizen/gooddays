using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

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

    [Column("tracking_options_json", TypeName = "jsonb")]
    public JsonDocument TrackingOptionsJson { get; set; } = JsonDocument.Parse("[\"sleep_hours\",\"workout_minutes\",\"phone_minutes\"]");

    [Column("dashboard_preset")]
    public string DashboardPreset { get; set; } = "balanced";

    [Column("dashboard_weights_json", TypeName = "jsonb")]
    public JsonDocument DashboardWeightsJson { get; set; } = JsonDocument.Parse("{\"tasks\":35,\"routine\":20,\"body\":15,\"workout\":15,\"finance\":10,\"journal\":5}");

    [Column("height_cm")]
    public decimal? HeightCm { get; set; }

    [Column("target_weight_kg")]
    public decimal? TargetWeightKg { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
