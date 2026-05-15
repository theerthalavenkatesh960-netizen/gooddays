namespace GoodDaysApi.Models;

public class CardExpense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CardId { get; set; }
    public int ExpenseId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual CreditCard? Card { get; set; }
    public virtual Expense? Expense { get; set; }
}
