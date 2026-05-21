using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("finance_budget_profiles")]
public class FinanceBudgetProfile
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("monthly_income")]
    public decimal MonthlyIncome { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public ICollection<FinanceFixedExpense> FixedExpenses { get; set; } = new List<FinanceFixedExpense>();
    public ICollection<MonthlyIncomeOverride> MonthlyIncomeOverrides { get; set; } = new List<MonthlyIncomeOverride>();
}
