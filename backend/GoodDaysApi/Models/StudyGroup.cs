using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("study_groups")]
public class StudyGroup
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Required]
    [Column("name")]
    public string? Name { get; set; }
    
    [Column("target_size")]
    public int TargetSize { get; set; } = 0;
    
    [Column("current_size")]
    public int CurrentSize { get; set; } = 0;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
