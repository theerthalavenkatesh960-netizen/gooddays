namespace GoodDaysApi.DTOs.Financial;

public class TaskDto
{
    public Guid Id { get; set; }
    public Guid BucketId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TaskType { get; set; } = "CUSTOM";
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }
    public int? RecurrenceDay { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public decimal? ActualAmount { get; set; }
    public string? Notes { get; set; }
}

public class CreateTaskRequest
{
    public Guid BucketId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TaskType { get; set; } = "CUSTOM";
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }
    public int? RecurrenceDay { get; set; }
}

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? TaskType { get; set; }
    public decimal? Amount { get; set; }
    public bool? IsRecurring { get; set; }
    public int? RecurrenceDay { get; set; }
}

public class CompleteTaskRequest
{
    public decimal? ActualAmount { get; set; }
    public string? Notes { get; set; }
}