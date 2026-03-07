namespace GoodDaysApi.DTOs.Financial;

public class DashboardDto
{
    public string CurrentMonth { get; set; } = string.Empty;
    public decimal OverallCompletionPercent { get; set; }
    public int Streak { get; set; }
    public List<BucketDto> Buckets { get; set; } = new();
    public MonthlySnapshotDto? MonthlySnapshot { get; set; }
    public List<RuleDto> Rules { get; set; } = new();
    public List<TaskDto> UpcomingTasks { get; set; } = new();
    public List<TaskDto> MissedTasks { get; set; } = new();
}

public class MonthlyHistoryDto
{
    public string Month { get; set; } = string.Empty;
    public int Year { get; set; }
    public int MonthNumber { get; set; }
    public decimal CompletionPercent { get; set; }
    public decimal TotalInvested { get; set; }
}