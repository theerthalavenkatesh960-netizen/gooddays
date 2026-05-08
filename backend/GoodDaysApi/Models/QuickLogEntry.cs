using System.Text.Json.Serialization;

namespace GoodDaysApi.Models;

public class QuickLogEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Type of log entry: workout, meal, expense, water, task
    /// </summary>
    public string Type { get; set; } = null!;
    
    /// <summary>
    /// JSON payload containing the log data
    /// Format depends on Type:
    /// - workout: { exerciseId, reps?, weightKg?, notes? }
    /// - meal: { mealIds: number[] }
    /// - expense: { amount, category, note? }
    /// - water: { ml }
    /// - task: { title, category?, priority?, description? }
    /// </summary>
    public string PayloadJson { get; set; } = "{}";
    
    [JsonIgnore]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
