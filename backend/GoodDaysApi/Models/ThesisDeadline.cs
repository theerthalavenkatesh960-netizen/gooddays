using System;
namespace GoodDaysApi.Models;

public class ThesisDeadline
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string Title { get; set; }
    public DateTime Date { get; set; }
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
