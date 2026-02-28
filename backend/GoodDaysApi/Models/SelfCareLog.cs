using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

// corresponds to `self_care_logs` table in supabase migrations
[Table("self_care_logs")]
public class SelfCareLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Required]
    [Column("date")]
    public DateTime Date { get; set; }
    [Required]
    [Column("template_id")]
    public Guid TemplateId { get; set; }
    [Column("completed")]
    public bool Completed { get; set; } = false;
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
