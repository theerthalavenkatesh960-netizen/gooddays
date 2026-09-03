using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("order_items")]
public class OrderItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("order_id")]
    public Guid OrderId { get; set; }

    [Required]
    [Column("name")]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Column("amount")]
    public decimal? Amount { get; set; }

    [Column("line_number")]
    public int LineNumber { get; set; }

    [ForeignKey(nameof(OrderId))]
    public Order? Order { get; set; }
}
