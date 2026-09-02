using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("orders")]
public class Order
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("merchant")]
    public string? Merchant { get; set; }

    [Column("order_number")]
    [MaxLength(120)]
    public string? OrderNumber { get; set; }

    [Column("order_date")]
    public DateTime? OrderDate { get; set; }

    [Column("total_amount")]
    public decimal? TotalAmount { get; set; }

    [Column("currency")]
    public string Currency { get; set; } = "INR";

    [Column("source_message_id")]
    [MaxLength(200)]
    public string? SourceMessageId { get; set; }

    [Column("evidence_json")]
    public string EvidenceJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
