using GoodDaysApi.Services.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Authorize]
[Route("api/ai-chat")]
public class AiChatController : ControllerBase
{
    private readonly IAiChatService _aiChatService;
    private readonly ILogger<AiChatController> _logger;

    public AiChatController(IAiChatService aiChatService, ILogger<AiChatController> logger)
    {
        _aiChatService = aiChatService;
        _logger = logger;
    }

    private int GetUserId()
    {
        var claim = User.FindFirst("userId") ?? User.FindFirst("sub") ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null)
        {
            throw new UnauthorizedAccessException("User id claim missing");
        }
        return int.Parse(claim.Value);
    }

    [HttpPost]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
    {
        try
        {
            var userId = GetUserId();
            var conversation = await _aiChatService.CreateConversationAsync(userId, request?.Title);
            return Ok(new { id = conversation.Id, title = conversation.Title });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation");
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{conversationId}")]
    public async Task<IActionResult> GetConversation(int conversationId)
    {
        try
        {
            var userId = GetUserId();
            var conversation = await _aiChatService.GetConversationAsync(userId, conversationId);
            return Ok(conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching conversation");
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{conversationId}/message")]
    public async Task<IActionResult> SendMessage(int conversationId, [FromBody] SendMessageRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request?.Content))
            {
                return BadRequest("Message content is required");
            }

            var userId = GetUserId();
            var response = await _aiChatService.ProcessMessageAsync(userId, conversationId, request.Content);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations()
    {
        try
        {
            var userId = GetUserId();
            var conversations = await _aiChatService.GetUserConversationsAsync(userId);
            return Ok(conversations.Select(c => new { c.Id, c.Title, c.CreatedAt, c.UpdatedAt }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching conversations");
            return BadRequest(ex.Message);
        }
    }
}

public class CreateConversationRequest
{
    public string Title { get; set; }
}

public class SendMessageRequest
{
    public string Content { get; set; }
}
