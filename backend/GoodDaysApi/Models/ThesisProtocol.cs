using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("thesis_protocols")]
public class ThesisProtocol
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Column("title")]
    public string? Title { get; set; }
    
    [Column("guide_name")]
    public string? GuideName { get; set; }
    
    [Column("department")]
    public string? Department { get; set; }
    
    [Column("college")]
    public string? College { get; set; }
    
    [Column("study_type")]
    public string? StudyType { get; set; }
    
    [Column("total_sample_size")]
    public int TotalSampleSize { get; set; } = 0;
    
    [Column("start_date")]
    public DateTime? StartDate { get; set; }
    
    [Column("end_date")]
    public DateTime? EndDate { get; set; }
    
    [Column("protocol_approved")]
    public bool ProtocolApproved { get; set; } = false;
    
    [Column("approval_date")]
    public DateTime? ApprovalDate { get; set; }
    
    [Column("iec_number")]
    public string? IecNumber { get; set; }
    
    [Column("synopsis_submitted")]
    public bool SynopsisSubmitted { get; set; } = false;
    
    [Column("synopsis_approved")]
    public bool SynopsisApproved { get; set; } = false;
    
    [Column("ethics_submitted")]
    public bool EthicsSubmitted { get; set; } = false;
    
    [Column("ethics_approved")]
    public bool EthicsApproved { get; set; } = false;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
