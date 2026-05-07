namespace GoodDaysApi.Models;

public class Goal
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; } // DSA, Fitness, Finance, etc.
    public string? Color { get; set; } // hex color for UI
    public string? Icon { get; set; } // emoji icon
    public DateTime? TargetDate { get; set; }
    public string Status { get; set; } = "active"; // active, completed, paused
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GoalNote> Notes { get; set; } = new List<GoalNote>();
    public ICollection<GoalDailyLog> DailyLogs { get; set; } = new List<GoalDailyLog>();
    public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
}

public class GoalNote
{
    public int Id { get; set; }
    public int GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Title { get; set; } = "Untitled Note";
    /// <summary>
    /// Rich text content stored as JSON array of blocks:
    /// [{ type: "paragraph"|"heading"|"code"|"checklist"|"bullet", content: string, checked?: bool, language?: string }]
    /// </summary>
    public string Content { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class GoalDailyLog
{
    public int Id { get; set; }
    public int GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public DateTime Date { get; set; }
    public string? Content { get; set; } // what I did today
    public int MinutesSpent { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Flashcard
{
    public int Id { get; set; }
    public int GoalId { get; set; }
    public Goal Goal { get; set; } = null!;
    public string Topic { get; set; } = string.Empty; // e.g. "Arrays", "DP"
    public string Front { get; set; } = string.Empty; // question / concept
    public string Back { get; set; } = string.Empty; // explanation / answer
    /// <summary>
    /// Confidence: 0=New, 1=Hard, 2=Medium, 3=Good, 4=Easy, 5=Mastered
    /// </summary>
    public int ConfidenceLevel { get; set; } = 0;
    public DateTime? LastReviewed { get; set; }
    public DateTime? NextReview { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
