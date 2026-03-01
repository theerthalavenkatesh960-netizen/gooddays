using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_notes")]
public class DailyNote
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("date")]
    public DateTime Date { get; set; }

    [Column("note")]
    public string Note { get; set; } = string.Empty;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}