using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services.Ai;

public class ChatResponse
{
    public string AiResponse { get; set; } = string.Empty;
    public List<ActionResult> ActionsTaken { get; set; } = new();
    public int MessageId { get; set; }
}

public class ActionResult
{
    public string Type { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string Summary { get; set; } = string.Empty;
}

public class ConversationDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public List<MessageDto> Messages { get; set; } = new();
}

public class MessageDto
{
    public int Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public interface IAiChatService
{
    Task<ChatResponse> ProcessMessageAsync(int userId, int conversationId, string userMessage);
    Task<ConversationDto> GetConversationAsync(int userId, int conversationId);
    Task<List<AiConversation>> GetUserConversationsAsync(int userId);
    Task<AiConversation> CreateConversationAsync(int userId, string? title = null);
}

public class AiChatService : IAiChatService
{
    private readonly AppDbContext _db;
    private readonly IAiToolsRegistry _toolsRegistry;
    private readonly ILlmProvider _llmProvider;
    private readonly ILogger<AiChatService> _logger;

    public AiChatService(
        AppDbContext db,
        IAiToolsRegistry toolsRegistry,
        ILlmProvider llmProvider,
        ILogger<AiChatService> logger)
    {
        _db = db;
        _toolsRegistry = toolsRegistry;
        _llmProvider = llmProvider;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessMessageAsync(int userId, int conversationId, string userMessage)
    {
        try
        {
            var conversation = await _db.AiConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

            if (conversation == null)
            {
                throw new InvalidOperationException("Conversation not found");
            }

            var userMsg = new AiMessage
            {
                ConversationId = conversationId,
                UserId = userId,
                Role = "user",
                Content = userMessage,
                CreatedAt = DateTime.UtcNow
            };
            _db.AiMessages.Add(userMsg);
            await _db.SaveChangesAsync();

            var history = conversation.Messages
                .OrderByDescending(m => m.CreatedAt)
                .Take(10)
                .OrderBy(m => m.CreatedAt)
                .ToList();
            history.Add(userMsg);

            var availableTools = _toolsRegistry.GetAvailableTools();
            var llmResponse = await _llmProvider.CallAsync(userMessage, history, availableTools);

            JsonDocument? actionTaken = null;
            string finalResponse = llmResponse.Content;

            if (llmResponse.ToolCall != null)
            {
                actionTaken = JsonDocument.Parse(JsonSerializer.Serialize(new
                {
                    type = "tool_call",
                    name = llmResponse.ToolCall.Name,
                    parameters = llmResponse.ToolCall.Parameters
                }));

                var continued = await _llmProvider.ContinueAsync("Tool call requested but execution is not implemented yet.", availableTools);
                if (!string.IsNullOrWhiteSpace(continued.Content))
                {
                    finalResponse = continued.Content;
                }
            }

            var aiMsg = new AiMessage
            {
                ConversationId = conversationId,
                UserId = userId,
                Role = "assistant",
                Content = finalResponse,
                ActionTaken = actionTaken ?? JsonDocument.Parse("{}"),
                TokensUsed = llmResponse.TokensUsed,
                CreatedAt = DateTime.UtcNow
            };
            _db.AiMessages.Add(aiMsg);

            if (conversation.Messages.Count == 0)
            {
                conversation.Title = GenerateTitle(userMessage);
            }
            conversation.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return new ChatResponse
            {
                AiResponse = finalResponse,
                MessageId = aiMsg.Id,
                ActionsTaken = new()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing AI message for user {UserId}", userId);
            throw;
        }
    }

    public async Task<ConversationDto> GetConversationAsync(int userId, int conversationId)
    {
        var conversation = await _db.AiConversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

        if (conversation == null)
        {
            throw new InvalidOperationException("Conversation not found");
        }

        return new ConversationDto
        {
            Id = conversation.Id,
            Title = conversation.Title,
            Messages = conversation.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    CreatedAt = m.CreatedAt
                })
                .ToList()
        };
    }

    public async Task<List<AiConversation>> GetUserConversationsAsync(int userId)
    {
        return await _db.AiConversations
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();
    }

    public async Task<AiConversation> CreateConversationAsync(int userId, string? title = null)
    {
        var conversation = new AiConversation
        {
            UserId = userId,
            Title = title ?? "New Chat",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.AiConversations.Add(conversation);
        await _db.SaveChangesAsync();

        return conversation;
    }

    private string GenerateTitle(string userMessage)
    {
        var title = userMessage.Length > 50
            ? userMessage.Substring(0, 50) + "..."
            : userMessage;

        return title;
    }
}

