using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("thesis_patients")]
public class ThesisPatient
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Column("patient_code")]
    public string? PatientCode { get; set; }
    
    [Column("patient_id")]
    public string? PatientId { get; set; }
    
    [Column("study_number")]
    public string? StudyNumber { get; set; }
    
    [Column("group_name")]
    public string? GroupName { get; set; }
    
    [Column("study_group_id")]
    public int? StudyGroupId { get; set; }
    
    [Column("protocol_id")]
    public int? ProtocolId { get; set; }
    
    [Column("recruitment_date")]
    public DateTime? RecruitmentDate { get; set; }
    
    [Column("date_added")]
    public DateTime? DateAdded { get; set; } = DateTime.UtcNow;
    
    [Column("age")]
    public int? Age { get; set; }
    
    [Column("gender")]
    public string? Gender { get; set; }
    
    [Column("consent_taken")]
    public bool ConsentTaken { get; set; } = false;
    
    [Column("inclusion_criteria_met")]
    public bool InclusionCriteriaMet { get; set; } = false;
    
    [Column("exclusion_criteria_met")]
    public bool ExclusionCriteriaMet { get; set; } = false;
    
    [Column("proforma_status")]
    public string? ProformaStatus { get; set; } = "pending";
    
    [Column("followup_status")]
    public string? FollowupStatus { get; set; } = "pending";
    
    [Column("dropout")]
    public bool Dropout { get; set; } = false;
    
    [Column("notes")]
    public string? Notes { get; set; } = "";
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
    
    public List<ThesisFollowup>? Followups { get; set; }
}
