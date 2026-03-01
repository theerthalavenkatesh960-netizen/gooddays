using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("self_care_template")]
public class SelfCareTemplate
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Required]
    [Column("item")]
    public string Item { get; set; } = string.Empty;

    [Column("order_index")]
    public int OrderIndex { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}