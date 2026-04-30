namespace GoodDaysApi.DTOs.Financial;

public class MonthlySnapshotDto
{
    public Guid Id { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal EmergencyFundBalance { get; set; }
    public decimal TravelFundBalance { get; set; }
    public decimal PortfolioEstimatedValue { get; set; }
    public string? Notes { get; set; }
    public decimal SavingsRate { get; set; }
}

public class CreateSnapshotRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal EmergencyFundBalance { get; set; }
    public decimal TravelFundBalance { get; set; }
    public decimal PortfolioEstimatedValue { get; set; }
    public string? Notes { get; set; }
}