namespace GoodDaysApi.Models;

public class AiConversation
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    
    public string Title { get; set; } = "Chat";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public User User { get; set; }
    public ICollection<AiMessage> Messages { get; set; } = new List<AiMessage>();
}
