namespace GoodDaysApi.DTOs.Meal;

public class UpsertPlanRequestDto
{
    public string? PlanJson { get; set; }
}

public class CopyLastWeekRequestDto
{
    public string SourceDate { get; set; } = string.Empty;
    public string? TargetDate { get; set; }
}

public class UpsertDailyLogRequestDto
{
    public string Date { get; set; } = string.Empty;
    public List<int> MealIds { get; set; } = new();
}
