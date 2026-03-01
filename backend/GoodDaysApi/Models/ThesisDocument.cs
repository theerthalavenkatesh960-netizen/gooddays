using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("thesis_documents")]
public class ThesisDocument
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Required]
    [Column("file_name")]
    public string? FileName { get; set; }
    
    [Column("document_type")]
    public string? DocumentType { get; set; }
    
    [Column("file_path")]
    public string? FilePath { get; set; }
    
    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
