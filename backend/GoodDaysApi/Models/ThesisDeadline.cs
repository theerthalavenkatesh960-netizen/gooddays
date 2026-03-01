using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("thesis_deadlines")]
public class ThesisDeadline
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Required]
    [Column("title")]
    public string? Title { get; set; }
    
    [Required]
    [Column("date")]
    public DateTime Date { get; set; }
    
    [Column("completed")]
    public bool Completed { get; set; } = false;
    
    [Column("notes")]
    public string? Notes { get; set; } = "";
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
