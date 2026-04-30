namespace GoodDaysApi.DTOs.Financial;

public class RuleDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "MINDSET";
    public string DisplayStyle { get; set; } = "CARD";
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class CreateRuleRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "MINDSET";
    public string DisplayStyle { get; set; } = "CARD";
    public int SortOrder { get; set; }
}

public class UpdateRuleRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? DisplayStyle { get; set; }
    public bool? IsActive { get; set; }
    public int? SortOrder { get; set; }
}

public class GroupedRulesDto
{
    public List<RuleDto> Investment { get; set; } = new();
    public List<RuleDto> Trading { get; set; } = new();
    public List<RuleDto> Mindset { get; set; } = new();
    public List<RuleDto> Lifestyle { get; set; } = new();
}