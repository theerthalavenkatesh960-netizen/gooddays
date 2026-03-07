using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("monthly_tasks")]
public class MonthlyTask
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("bucket_id")]
    public Guid BucketId { get; set; }

    [Required]
    [Column("title")]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Required]
    [Column("task_type")]
    [MaxLength(50)]
    public string TaskType { get; set; } = "CUSTOM";

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("is_recurring")]
    public bool IsRecurring { get; set; }

    [Column("recurrence_day")]
    public int? RecurrenceDay { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(BucketId))]
    public InvestmentBucket? Bucket { get; set; }

    public ICollection<MonthlyTaskCompletion> Completions { get; set; } = new List<MonthlyTaskCompletion>();
}