using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

public class ThesisEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? Status { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
