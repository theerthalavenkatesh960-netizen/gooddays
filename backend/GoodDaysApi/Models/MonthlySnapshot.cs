using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("monthly_snapshots")]
public class MonthlySnapshot
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("month")]
    public int Month { get; set; }

    [Required]
    [Column("year")]
    public int Year { get; set; }

    [Column("total_income")]
    public decimal TotalIncome { get; set; }

    [Column("total_expenses")]
    public decimal TotalExpenses { get; set; }

    [Column("total_invested")]
    public decimal TotalInvested { get; set; }

    [Column("emergency_fund_balance")]
    public decimal EmergencyFundBalance { get; set; }

    [Column("travel_fund_balance")]
    public decimal TravelFundBalance { get; set; }

    [Column("portfolio_estimated_value")]
    public decimal PortfolioEstimatedValue { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}