using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("financial_goals")]
public class FinancialGoal
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("target_amount")]
    public decimal TargetAmount { get; set; }

    [Column("target_date")]
    public DateTime? TargetDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;
}