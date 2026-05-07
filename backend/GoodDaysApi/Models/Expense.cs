using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("expenses")]
public class Expense
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Column("amount")]
    public decimal Amount { get; set; }
    [Column("category")]
    public string? Category { get; set; }

    // optional date for the expense; falls back to CreatedAt when not set
    [Column("date")]
    public DateTime? Date { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
