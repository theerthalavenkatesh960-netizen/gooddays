using System;
namespace GoodDaysApi.Models;

public class ThesisProtocol
{
    public int Id { get; set; }
    public string UserId { get; set; }
    public string Title { get; set; }
    public string GuideName { get; set; }
    public string CoGuideName { get; set; }
    public string Department { get; set; }
    public string StudyType { get; set; }
    public DateTime? ProtocolSubmittedDate { get; set; }
    public DateTime? ProtocolApprovedDate { get; set; }
    public string IECApprovalNumber { get; set; }
    public string TrialRegistrationNumber { get; set; }
    public string SynopsisStatus { get; set; }
    public int TotalSampleSize { get; set; }
    public int Group_A_Size { get; set; }
    public int Group_B_Size { get; set; }
    public int Group_C_Size { get; set; }
    public double Completion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
