using System;
using System.Collections.Generic;
namespace GoodDaysApi.Models;

public class ThesisPatient
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string PatientId { get; set; }
    public string PatientCode { get; set; }
    public string StudyNumber { get; set; }
    public string GroupName { get; set; }
    public Guid? StudyGroupId { get; set; }
    public Guid? ProtocolId { get; set; }
    public DateTime RecruitmentDate { get; set; }
    public DateTime? DateAdded { get; set; } = DateTime.UtcNow;
    public int? Age { get; set; }
    public string Gender { get; set; }
    public bool ConsentTaken { get; set; }
    public bool InclusionCriteriaMet { get; set; }
    public bool ExclusionCriteriaMet { get; set; }
    public string ProformaStatus { get; set; }
    public string FollowupStatus { get; set; }
    public bool DroppedOut { get; set; }
    public string Notes { get; set; }
    public List<ThesisFollowup> Followups { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
