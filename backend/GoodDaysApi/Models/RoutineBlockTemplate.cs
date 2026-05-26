using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("routine_block_templates")]
public class RoutineBlockTemplate
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("category")]
    public string? Category { get; set; }

    [Column("color")]
    public string? Color { get; set; }

    [Column("default_start_time")]
    public string? DefaultStartTime { get; set; }

    [Column("default_end_time")]
    public string? DefaultEndTime { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
