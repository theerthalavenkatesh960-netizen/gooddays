namespace GoodDaysApi.DTOs.Financial;

public class BudgetProfileDto
{
    public Guid Id { get; set; }
    public decimal MonthlyIncome { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
    public decimal EffectiveMonthlyIncome { get; set; }
    public bool IsMonthlyIncomeOverridden { get; set; }
    public decimal? MonthlyIncomeOverrideAmount { get; set; }
    public List<FixedExpenseDto> FixedExpenses { get; set; } = new();
}

public class FixedExpenseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal DefaultAmount { get; set; }
    public decimal EffectiveAmount { get; set; }
    public bool IsOverridden { get; set; }
    public decimal? OverrideAmount { get; set; }
}

public class UpdateBudgetIncomeRequest
{
    public decimal MonthlyIncome { get; set; }
}

public class CreateFixedExpenseRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class UpsertMonthlyIncomeOverrideRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
}

public class UpsertFixedExpenseOverrideRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
}
