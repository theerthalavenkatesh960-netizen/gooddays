namespace GoodDaysApi.Models;

public class Exercise
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MuscleGroup { get; set; } = string.Empty; // Chest, Back, Shoulders, Arms, Legs, Core, Cardio
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsCustom { get; set; } = false;
    public int? UserId { get; set; } // null = built-in library
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
