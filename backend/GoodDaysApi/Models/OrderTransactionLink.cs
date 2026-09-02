using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("order_transaction_links")]
public class OrderTransactionLink
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("order_id")]
    public Guid OrderId { get; set; }

    [Required]
    [Column("expense_id")]
    public int ExpenseId { get; set; }

    [Column("match_score")]
    public decimal MatchScore { get; set; }

    [Column("match_method")]
    [MaxLength(60)]
    public string MatchMethod { get; set; } = "AMOUNT_DATE";

    [Column("status")]
    [MaxLength(30)]
    public string Status { get; set; } = "NEEDS_REVIEW";

    [Column("evidence_json")]
    public string EvidenceJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(OrderId))]
    public Order? Order { get; set; }

    [ForeignKey(nameof(ExpenseId))]
    public Expense? Expense { get; set; }
}
