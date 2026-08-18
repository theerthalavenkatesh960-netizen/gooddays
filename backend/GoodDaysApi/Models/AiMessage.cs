using System.Text.Json;

namespace GoodDaysApi.Models;

public class AiMessage
{
    public int Id { get; set; }
    
    public int ConversationId { get; set; }
    
    public int UserId { get; set; }
    
    public string Role { get; set; } // "user" or "assistant"
    
    public string Content { get; set; }
    
    public JsonDocument ActionTaken { get; set; }
    
    public int? TokensUsed { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public AiConversation Conversation { get; set; }
    public User User { get; set; }
}
