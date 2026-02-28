using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("tasks")]
public class DailyTask
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public bool Recurring { get; set; } = false;
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
