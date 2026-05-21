using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("investment_buckets")]
public class InvestmentBucket
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("name")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("category")]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Column("monthly_target")]
    public decimal MonthlyTarget { get; set; }

    [Column("target_amount")]
    public decimal TargetAmount { get; set; }

    [Column("current_amount")]
    public decimal CurrentAmount { get; set; }

    [Column("frequency")]
    [MaxLength(20)]
    public string Frequency { get; set; } = "monthly";

    [Column("period_months")]
    public int PeriodMonths { get; set; }

    [Column("invested_in")]
    [MaxLength(200)]
    public string? InvestedIn { get; set; }

    [Column("color_hex")]
    [MaxLength(7)]
    public string? ColorHex { get; set; }

    [Column("icon")]
    [MaxLength(50)]
    public string? Icon { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public ICollection<MonthlyTask> Tasks { get; set; } = new List<MonthlyTask>();
    public ICollection<BucketContribution> Contributions { get; set; } = new List<BucketContribution>();
}