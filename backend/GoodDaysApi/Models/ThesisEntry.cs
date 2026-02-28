using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

// maps to `thesis_patients` table in Supabase schema
[Table("thesis_patients")]
public class ThesisEntry
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }
    // map to thesis_patients columns
    [Required]
    [Column("group_name")]
    public string Title { get; set; } = string.Empty;
    [Column("notes")]
    public string? Content { get; set; }
    [Column("proforma_status")]
    public string? Status { get; set; }
    [Column("date")]
    public DateTime Date { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // the migration does not include an updated_at column; remove property to avoid errors
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
