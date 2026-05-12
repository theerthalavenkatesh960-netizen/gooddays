using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("body_weight_logs")]
public class BodyWeightLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("weight_kg")]
    public decimal WeightKg { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    [Column("logged_at")]
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
}
