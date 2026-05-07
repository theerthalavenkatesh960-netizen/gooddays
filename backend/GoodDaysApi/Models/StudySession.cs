using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

// maps to `study_sessions` table defined in Supabase migrations
[Table("study_sessions")]
public class StudySession
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("durationminutes")]
    public int DurationMinutes { get; set; }
    [Column("notes")]
    public string? Notes { get; set; }
    [Column("date")]
    public DateTime Date { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
