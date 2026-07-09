using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services.Ai;

public class ChatResponse
{
    public string AiResponse { get; set; }
    public List<ActionResult> ActionsTaken { get; set; } = new();
    public int MessageId { get; set; }
}

public class ActionResult
{
    public string Type { get; set; }
    public string EntityType { get; set; }
    public int? EntityId { get; set; }
    public string Summary { get; set; }
}

public class ConversationDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public List<MessageDto> Messages { get; set; }
}

public class MessageDto
{
    public int Id { get; set; }
    public string Role { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; }
}

public interface IAiChatService
{
    Task<ChatResponse> ProcessMessageAsync(int userId, int conversationId, string userMessage);
    Task<ConversationDto> GetConversationAsync(int userId, int conversationId);
    Task<List<AiConversation>> GetUserConversationsAsync(int userId);
    Task<AiConversation> CreateConversationAsync(int userId, string title = null);
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
            // Load conversation
            var conversation = await _db.AiConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

            if (conversation == null)
            {
                throw new InvalidOperationException("Conversation not found");
            }

            // Save user message
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

            // Get conversation history (last 10 messages)
            var history = conversation.Messages
                .OrderByDescending(m => m.CreatedAt)
                .Take(10)
                .OrderBy(m => m.CreatedAt)
                .ToList();

            // Get available tools
            var availableTools = _toolsRegistry.GetAvailableTools();

            // Call LLM
            var llmResponse = await _llmProvider.CallAsync(userMessage, history, availableTools);

            // TODO: Handle tool calls when implemented
            // For now, just respond directly

            // Save AI message
            var aiMsg = new AiMessage
            {
                ConversationId = conversationId,
                UserId = userId,
                Role = "assistant",
                Content = llmResponse.Content,
                TokensUsed = llmResponse.TokensUsed,
                CreatedAt = DateTime.UtcNow
            };
            _db.AiMessages.Add(aiMsg);
            await _db.SaveChangesAsync();

            // Update conversation title if it's the first message
            if (conversation.Messages.Count == 1)
            {
                await _db.SaveChangesAsync();
                        // Handle tool calls if LLM requested any
                        var actionsTaken = new List<ActionResult>();
                        var finalResponse = llmResponse.Content;

                        if (llmResponse.ToolCall != null)
                        {
                            try
                            {
                                // Execute the tool
                                var toolResult = await _toolExecutor.ExecuteAsync(
                                    userId,
                                    llmResponse.ToolCall.Name,
                                    llmResponse.ToolCall.Parameters);

                                // Record the action taken
                                actionsTaken.Add(new ActionResult
                                {
                                    Type = "tool_execution",
                                    EntityType = llmResponse.ToolCall.Name,
                                    Summary = toolResult
                                });

                                // Append tool result to response
                                finalResponse = llmResponse.Content + "\n\n**Tool Result:**\n" + toolResult;
                            }
                            catch (Exception toolEx)
                            {
                                _logger.LogError(toolEx, "Error executing tool {ToolName}", llmResponse.ToolCall.Name);
                                actionsTaken.Add(new ActionResult
                                {
                                    Type = "tool_error",
                                    EntityType = llmResponse.ToolCall.Name,
                                    Summary = $"Tool execution failed: {toolEx.Message}"
                                });
                            }
                        }
            }

            return new ChatResponse
            {
                AiResponse = llmResponse.Content,
                MessageId = aiMsg.Id,
                ActionsTaken = new()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing AI message for user {UserId}", userId);
            throw;
                        // Save AI message with action tracking
                        var aiMsg = new AiMessage
                        {
                            ConversationId = conversationId,
                            UserId = userId,
                            Role = "assistant",
                            Content = finalResponse,
                            ActionTaken = actionsTaken.Any() ? string.Join("|", actionsTaken.Select(a => $"{a.Type}:{a.EntityType}")) : null,
                            TokensUsed = llmResponse.TokensUsed,
                            CreatedAt = DateTime.UtcNow
                        };
                    ILlmProvider llmProvider,
                    _toolExecutor = toolExecutor;
                        return new ChatResponse
                        {
                            AiResponse = finalResponse,
                            MessageId = aiMsg.Id,
                            ActionsTaken = actionsTaken
                        };
                    _logger = logger;
                }
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

    public async Task<AiConversation> CreateConversationAsync(int userId, string title = null)
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
        // Simple title generation from first 50 chars
        var title = userMessage.Length > 50 
            ? userMessage.Substring(0, 50) + "..." 
            : userMessage;

        return title;
    }
}

