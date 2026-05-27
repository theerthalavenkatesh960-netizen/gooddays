namespace GoodDaysApi.DTOs;

public class JournalEntryDto
{
    public DateTime Date { get; set; }
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? MoodTag { get; set; }
    public string? ImageUrl { get; set; }
}
