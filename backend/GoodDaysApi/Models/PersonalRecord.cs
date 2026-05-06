namespace GoodDaysApi.Models;

public class PersonalRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int ExerciseId { get; set; }
    public Exercise Exercise { get; set; } = null!;
    public decimal MaxWeightKg { get; set; }
    public int Reps { get; set; } // reps at that max weight
    public DateTime AchievedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
