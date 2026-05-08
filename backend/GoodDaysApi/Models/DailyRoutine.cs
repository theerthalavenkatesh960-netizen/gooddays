using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_routines")]
public class DailyRoutine
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("color")]
    public string Color { get; set; } = "#6C63FF";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<RoutineBlock> Blocks { get; set; } = new();
}
