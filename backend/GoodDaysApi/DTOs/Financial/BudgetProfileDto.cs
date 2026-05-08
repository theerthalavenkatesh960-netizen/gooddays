namespace GoodDaysApi.DTOs.Financial;

public class BudgetProfileDto
{
    public Guid Id { get; set; }
    public decimal MonthlyIncome { get; set; }
    public List<FixedExpenseDto> FixedExpenses { get; set; } = new();
}

public class FixedExpenseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
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
