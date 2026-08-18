namespace GoodDaysApi.Models;

public class Exercise
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MuscleGroup { get; set; } = string.Empty;
    // Granular values: Upper Chest | Mid Chest | Lower Chest |
    //   Lats | Upper Traps | Rhomboids | Lower Back |
    //   Front Delt | Side Delt | Rear Delt |
    //   Biceps – Long Head | Biceps – Short Head |
    //   Triceps – Long Head | Triceps – Lateral Head | Triceps – Medial Head | Forearms |
    //   Quads | Hamstrings | Glutes | Calves | Hip Flexors |
    //   Upper Abs | Lower Abs | Obliques | Cardio | Full Body
    // Legacy broad values (Chest, Back, Shoulders, Arms, Legs, Core) still accepted.
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? VideoUrl { get; set; } // GIF/MP4 URL for form reference
    public string? BeginnerTips { get; set; } // Form cues for beginners (comma-separated)
    public string? AnimationFrames { get; set; } // JSON: array of animation keyframes with muscle intensity data
    public string? CommonMistakes { get; set; } // JSON: array of { mistake, correction, highlightedMuscles }
    public bool IsCustom { get; set; } = false;
    public int? UserId { get; set; } // null = built-in library
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
