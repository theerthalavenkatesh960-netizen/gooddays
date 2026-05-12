namespace GoodDaysApi.Models;

public class GoalChecklistItem
{
    public int Id { get; set; }
    public int GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;
    public int Position { get; set; } = 0;
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
