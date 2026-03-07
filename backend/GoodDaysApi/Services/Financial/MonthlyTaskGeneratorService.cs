using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Financial;

public class MonthlyTaskGeneratorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MonthlyTaskGeneratorService> _logger;

    public MonthlyTaskGeneratorService(
        IServiceProvider serviceProvider,
        ILogger<MonthlyTaskGeneratorService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            
            // Check if it's the 1st of the month and around midnight (give 1 hour window)
            if (now.Day == 1 && now.Hour == 0)
            {
                await GenerateMonthlyTaskCompletionsAsync();
                
                // Wait for 2 hours to avoid running multiple times
                await Task.Delay(TimeSpan.FromHours(2), stoppingToken);
            }
            
            // Check every hour
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task GenerateMonthlyTaskCompletionsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            var now = DateTime.UtcNow;
            var currentMonth = now.Month;
            var currentYear = now.Year;

            _logger.LogInformation(
                "Generating monthly task completions for {Month}/{Year}",
                currentMonth, currentYear);

            var recurringTasks = await db.MonthlyTasks
                .Where(t => t.IsActive && t.IsRecurring)
                .ToListAsync();

            foreach (var task in recurringTasks)
            {
                var exists = await db.MonthlyTaskCompletions
                    .AnyAsync(c => c.TaskId == task.Id && 
                                   c.Month == currentMonth && 
                                   c.Year == currentYear);

                if (!exists)
                {
                    db.MonthlyTaskCompletions.Add(new MonthlyTaskCompletion
                    {
                        TaskId = task.Id,
                        Month = currentMonth,
                        Year = currentYear,
                        IsCompleted = false
                    });

                    _logger.LogInformation(
                        "Created completion entry for task: {TaskTitle}", 
                        task.Title);
                }
            }

            await db.SaveChangesAsync();
            
            _logger.LogInformation(
                "Successfully generated {Count} task completions", 
                recurringTasks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating monthly task completions");
        }
    }
}