using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

public class Expense
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string Description { get; set; } = string.Empty;
    [Required]
    public decimal Amount { get; set; }
    [Required]
    public string Category { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
