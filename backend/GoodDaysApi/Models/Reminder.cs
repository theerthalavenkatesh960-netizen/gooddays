namespace GoodDaysApi.Models;

public class Reminder
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Time { get; set; } = "08:00"; // HH:MM format
    /// <summary>
    /// Frequency: "daily", "weekly", "custom"
    /// </summary>
    public string Frequency { get; set; } = "daily";
    /// <summary>
    /// JSON array of days when custom/weekly: ["Mon","Wed","Fri"] or [1,3,5] (0=Sun)
    /// </summary>
    public string ActiveDays { get; set; } = "[]";
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ReminderLog> Logs { get; set; } = new List<ReminderLog>();
}

public class ReminderLog
{
    public int Id { get; set; }
    public int ReminderId { get; set; }
    public Reminder Reminder { get; set; } = null!;
    public DateTime Date { get; set; }
    public bool MarkedDone { get; set; } = false;
    public DateTime? MarkedDoneAt { get; set; }
}
