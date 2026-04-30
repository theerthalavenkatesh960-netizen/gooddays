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

    public ICollection<MonthlyTask> Tasks { get; set; } = new List<MonthlyTask>();
}