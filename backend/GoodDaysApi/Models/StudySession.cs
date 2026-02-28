using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

public class StudySession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string Subject { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public string? Notes { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
