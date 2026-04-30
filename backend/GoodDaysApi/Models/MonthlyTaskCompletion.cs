using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("monthly_task_completions")]
public class MonthlyTaskCompletion
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("task_id")]
    public Guid TaskId { get; set; }

    [Required]
    [Column("month")]
    public int Month { get; set; }

    [Required]
    [Column("year")]
    public int Year { get; set; }

    [Column("is_completed")]
    public bool IsCompleted { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("actual_amount")]
    public decimal? ActualAmount { get; set; }

    [Column("notes")]
    [MaxLength(500)]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(TaskId))]
    public MonthlyTask? Task { get; set; }
}