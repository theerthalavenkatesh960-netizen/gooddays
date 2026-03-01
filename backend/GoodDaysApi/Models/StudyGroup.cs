using System;
namespace GoodDaysApi.Models;

public class StudyGroup
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string Name { get; set; }
    public int TargetSize { get; set; }
    public int CurrentSize { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
