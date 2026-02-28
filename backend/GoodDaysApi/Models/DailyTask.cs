using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("tasks")]
public class DailyTask
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;
    [Column("category")]
    public string? Category { get; set; }
    [Column("priority")]
    public string? Priority { get; set; }
    [Column("due_date")]
    public DateTime? DueDate { get; set; }
    [Column("recurring")]
    public bool Recurring { get; set; } = false;
    [Column("status")]
    public string Status { get; set; } = "pending";
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
