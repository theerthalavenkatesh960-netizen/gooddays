namespace GoodDaysApi.DTOs.Financial;

public class FinancialBucketDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal MonthlyTarget { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public decimal CompletionPercent { get; set; }
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public List<TaskDto>? Tasks { get; set; }
}

public class CreateFinancialBucketRequest
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal MonthlyTarget { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateFinancialBucketRequest
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public decimal? MonthlyTarget { get; set; }
    public string? ColorHex { get; set; }
    public string? Icon { get; set; }
    public int? SortOrder { get; set; }
}