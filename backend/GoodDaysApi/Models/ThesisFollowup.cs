using System;
namespace GoodDaysApi.Models;

public class ThesisFollowup
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Label { get; set; } // Baseline, 1 Month, 3 Months...
    public DateTime? Date { get; set; }
    public bool Completed { get; set; }
    public string Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
