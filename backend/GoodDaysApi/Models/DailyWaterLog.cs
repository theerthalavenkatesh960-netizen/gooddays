namespace GoodDaysApi.Models;

public class DailyWaterLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Total ml consumed today
    /// </summary>
    public int MlConsumed { get; set; }
    
    /// <summary>
    /// Daily goal in ml (default: 2000)
    /// </summary>
    public int GoalMl { get; set; } = 2000;
    
    /// <summary>
    /// Unit of measurement: 'ml' or 'l'
    /// </summary>
    public string Unit { get; set; } = "ml";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
