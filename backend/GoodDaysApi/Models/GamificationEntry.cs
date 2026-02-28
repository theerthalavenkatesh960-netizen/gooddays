using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

// represents a log of points awarded to a user
[Table("gamification_entries")]
public class GamificationEntry
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Required]
    [Column("activity_type")]
    public string ActivityType { get; set; } = string.Empty;
    [Column("points")]
    public int Points { get; set; }
    [Column("date")]
    public DateTime Date { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
