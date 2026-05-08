namespace GoodDaysApi.DTOs.Financial;

public class FinancialBucketDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal MonthlyTarget { get; set; }
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public string Frequency { get; set; } = "monthly";
    public int PeriodMonths { get; set; }
    public string? InvestedIn { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public decimal CompletionPercent { get; set; }
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public List<TaskDto>? Tasks { get; set; }
    public List<BucketContributionDto>? Contributions { get; set; }
}

public class BucketContributionDto
{
    public Guid Id { get; set; }
    public Guid BucketId { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTime ContributionDate { get; set; }
}

public class CreateFinancialBucketRequest
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal MonthlyTarget { get; set; }
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public string Frequency { get; set; } = "monthly";
    public int PeriodMonths { get; set; }
    public string? InvestedIn { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateFinancialBucketRequest
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public decimal? MonthlyTarget { get; set; }
    public decimal? TargetAmount { get; set; }
    public decimal? CurrentAmount { get; set; }
    public string? Frequency { get; set; }
    public int? PeriodMonths { get; set; }
    public string? InvestedIn { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int? SortOrder { get; set; }
}

public class CreateBucketContributionRequest
{
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTime? ContributionDate { get; set; }
}