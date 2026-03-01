using System;
namespace GoodDaysApi.Models;

public class ThesisDocument
{
    public int Id { get; set; }
    public string UserId { get; set; }
    public string Name { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Category { get; set; }
    public string FilePath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
