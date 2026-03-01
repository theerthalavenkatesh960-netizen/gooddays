using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("thesis_followups")]
public class ThesisFollowup
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("patient_id")]
    public int PatientId { get; set; }
    
    [Column("visit_number")]
    public int? VisitNumber { get; set; }
    
    [Column("visit_date")]
    public DateTime? VisitDate { get; set; }
    
    [Column("status")]
    public string? Status { get; set; } = "pending";
    
    [Column("notes")]
    public string? Notes { get; set; } = "";
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(PatientId))]
    public ThesisPatient? Patient { get; set; }
}
