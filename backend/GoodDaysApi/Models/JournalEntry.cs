namespace GoodDaysApi.Models;

public class JournalEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? MoodTag { get; set; } // happy, grateful, motivated, tired, etc.
    public string? ImageUrl { get; set; } // optional uploaded image URL
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
